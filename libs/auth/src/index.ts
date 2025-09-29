// Auth Components Export
export { SignupForm } from './components/SignupForm'
export type { SignupFormProps, SignupFormData } from './components/SignupForm'

export { OTPInput } from './components/OTPInput'
export type { OTPInputProps } from './components/OTPInput'

export { MFAEnrollment } from './components/MFAEnrollment'
export type { MFAEnrollmentProps } from './components/MFAEnrollment'

export { PasskeyEnrollment } from './components/PasskeyEnrollment'
export type { PasskeyEnrollmentProps } from './components/PasskeyEnrollment'

export { VerificationStatus } from './components/VerificationStatus'
export type { VerificationStatusProps } from './components/VerificationStatus'

export { PhoneInput } from './components/PhoneInput'
export type { PhoneInputProps } from './components/PhoneInput'

// Hooks
export { useAuth } from './hooks/useAuth'
export { useVerification } from './hooks/useVerification'
export { useMFA } from './hooks/useMFA'
export { usePasskeys } from './hooks/usePasskeys'

// Utilities
export { validateAge } from './utils/validation'
export { computeZodiacSign } from './utils/zodiac'
export { formatPhoneE164 } from './utils/phone'