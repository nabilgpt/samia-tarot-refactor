import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Card, Select } from '@samia-tarot/ui-kit'
import { PhoneInput } from './PhoneInput'
import { validateAge, computeZodiacSign } from '../utils/validation'
import { formatPhoneE164 } from '../utils/phone'

// Signup schema as per M015 spec (mandatory fields)
const signupSchema = z.object({
  email: z.string().email('عنوان بريد إلكتروني صحيح مطلوب'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  firstName: z.string().min(1, 'الاسم الأول مطلوب'),
  lastName: z.string().min(1, 'اسم العائلة مطلوب'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
    errorMap: () => ({ message: 'يرجى تحديد الجنس' })
  }),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'prefer_not_to_say'], {
    errorMap: () => ({ message: 'يرجى تحديد الحالة الاجتماعية' })
  }),
  whatsapp: z.string().min(1, 'رقم واتساب مطلوب'),
  country: z.string().min(1, 'البلد مطلوب'),
  timeZone: z.string().default('Asia/Riyadh'),
  city: z.string().optional(),
  dob: z.string().refine(validateAge, {
    message: 'يجب أن يكون عمرك 18 سنة على الأقل'
  }),
  language: z.enum(['en', 'ar', 'fr']).default('ar')
})

export type SignupFormData = z.infer<typeof signupSchema>

export interface SignupFormProps {
  onSubmit: (data: SignupFormData & { zodiacSun: string }) => Promise<void>
  loading?: boolean
}

const genderOptions = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
  { value: 'other', label: 'أخرى' },
  { value: 'prefer_not_to_say', label: 'أفضل عدم الذكر' }
]

const maritalStatusOptions = [
  { value: 'single', label: 'أعزب' },
  { value: 'married', label: 'متزوج' },
  { value: 'divorced', label: 'مطلق' },
  { value: 'widowed', label: 'أرمل' },
  { value: 'prefer_not_to_say', label: 'أفضل عدم الذكر' }
]

const languageOptions = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' }
]

export const SignupForm: React.FC<SignupFormProps> = ({
  onSubmit,
  loading = false
}) => {
  const [zodiacSign, setZodiacSign] = useState<string>('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      timeZone: 'Asia/Riyadh',
      language: 'ar'
    }
  })

  const dobValue = watch('dob')

  // Auto-compute zodiac sign when DOB changes
  React.useEffect(() => {
    if (dobValue) {
      const zodiac = computeZodiacSign(new Date(dobValue))
      setZodiacSign(zodiac)
    }
  }, [dobValue])

  const handleFormSubmit = async (data: SignupFormData) => {
    const formattedData = {
      ...data,
      whatsapp: formatPhoneE164(data.whatsapp, data.country),
      zodiacSun: zodiacSign
    }

    await onSubmit(formattedData)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h2>
          <p className="text-gray-600 mt-2">انضم إلى منصة سامية تاروت</p>
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">المعلومات الشخصية</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="الاسم الأول"
              {...register('firstName')}
              error={errors.firstName?.message}
              required
            />
            <Input
              label="اسم العائلة"
              {...register('lastName')}
              error={errors.lastName?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الجنس <span className="text-red-500">*</span>
              </label>
              <Select
                {...register('gender')}
                options={genderOptions}
                error={errors.gender?.message}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحالة الاجتماعية <span className="text-red-500">*</span>
              </label>
              <Select
                {...register('maritalStatus')}
                options={maritalStatusOptions}
                error={errors.maritalStatus?.message}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="تاريخ الميلاد"
              type="date"
              {...register('dob')}
              error={errors.dob?.message}
              required
            />

            {zodiacSign && (
              <div className="flex items-center">
                <div className="bg-purple-100 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-purple-800">
                    برجك: {zodiacSign}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">معلومات الاتصال</h3>

          <Input
            label="البريد الإلكتروني"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            required
          />

          <PhoneInput
            label="رقم واتساب"
            value={watch('whatsapp')}
            onChange={(value, country) => {
              setValue('whatsapp', value)
              setValue('country', country.iso2)
            }}
            error={errors.whatsapp?.message}
            required
          />
        </div>

        {/* Location & Language */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">الموقع واللغة</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="المدينة"
              {...register('city')}
              error={errors.city?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اللغة المفضلة <span className="text-red-500">*</span>
              </label>
              <Select
                {...register('language')}
                options={languageOptions}
                error={errors.language?.message}
                required
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">الأمان</h3>

          <Input
            label="كلمة المرور"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            helperText="يجب أن تكون 8 أحرف على الأقل"
            required
          />
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            ملاحظة: سيتم إرسال رموز التحقق إلى بريدك الإلكتروني ورقم واتساب لتأكيد الحساب
          </p>
        </div>

        <Button
          type="submit"
          loading={loading}
          disabled={!isValid}
          fullWidth
          size="lg"
        >
          إنشاء الحساب
        </Button>
      </form>
    </Card>
  )
}