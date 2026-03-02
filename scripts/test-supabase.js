import { createClient } from '@supabase/supabase-js'

// استخدم القيم التي استخرجناها من لوحة التحكم
const supabaseUrl = 'https://laknjjfkoebbuajfmjmy.supabase.co'
const supabaseKey = 'sb_publishable_xdgVL2vsAZMV733n84RLFA_ocA19RMk' // الصق المفتاح الكامل هنا

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  // محاولة جلب بيانات من جدول (افترضنا أن لديك جدولاً باسم 'students')
  const { data, error } = await supabase
    .from('User profile table') 
    .select('*')
    .limit(1)

  if (error) {
    console.error('خطأ في الاتصال:', error.message)
  } else {
    console.log('تم الاتصال بنجاح! البيانات:', data)
  }
}

testConnection()
