import type { NextApiRequest, NextApiResponse } from 'next'

// هذا الرابط سيكون مخفياً في السيرفر ولن يراه المستخدم
const LOAD_BALANCER_URL = 'https://stackblitz-starters-dbbm52jd.vercel.app/api/vehicles'

// مفتاح سري للاتصال بـ Load Balancer (يجب أن يتطابق مع الموجود في Load Balancer)
const PROXY_SECRET = process.env.PROXY_SECRET || 'Qw@123123@Qw'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // السماح فقط بطلبات GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { nin } = req.query

  if (!nin) {
    return res.status(400).json({ error: 'Missing NIN' })
  }

  try {
    // الاتصال بـ Load Balancer من السيرفر (Server-to-Server)
    // المستخدم لا يرى هذا الاتصال
    const response = await fetch(`${LOAD_BALANCER_URL}?nin=${nin}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // نرسل المفتاح السري للتحقق
        'X-Proxy-Secret': PROXY_SECRET,
        // نمرر User-Agent الأصلي للمستخدم (اختياري)
        'User-Agent': req.headers['user-agent'] || 'Adnan-Proxy'
      }
    })

    const data = await response.json()

    // نرجع البيانات للمستخدم كما هي، أو نعالجها إذا أردنا إخفاء المزيد
    res.status(response.status).json(data)

  } catch (error) {
    console.error('Proxy Error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
