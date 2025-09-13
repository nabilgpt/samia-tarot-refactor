# App Store Privacy Configuration Guide

## Apple App Store Connect - Privacy Section

### Data Types We Collect

#### Contact Information
- **Email Addresses**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality, Customer Support, Developer Communications

- **Phone Numbers** 
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality, Customer Support

- **Name**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality, Customer Support

#### Sensitive Information
- **Date of Birth**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality (18+ age verification and zodiac calculation)

- **Other Sensitive Info** (Spiritual/Religious Questions)
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality

#### Location
- **Coarse Location** (Country only)
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality (timezone and payment method localization)

#### Identifiers
- **Device ID**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality, Customer Support

#### Usage Data
- **Product Interaction**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: Analytics, App Functionality

#### Audio Data
- **Audio Data**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality (voice recordings for readings)

#### Photos
- **Photos**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality (coffee cup readings)

#### Financial Info
- **Payment Info**
  - Linked to user: YES
  - Used for tracking: NO
  - Purposes: App Functionality

### Third Party Data Collection

#### Supabase (Authentication & Database)
- Contact information, usage data, device identifiers
- Purpose: User authentication and app functionality
- Link to privacy policy: https://supabase.com/privacy

#### Stripe (Payment Processing)
- Financial information, contact information
- Purpose: Payment processing
- Link to privacy policy: https://stripe.com/privacy

#### Twilio (SMS Verification)
- Phone numbers
- Purpose: Phone number verification
- Link to privacy policy: https://www.twilio.com/legal/privacy

#### Firebase (Push Notifications)
- Device identifiers
- Purpose: Push notifications
- Link to privacy policy: https://policies.google.com/privacy

### Age Rating Configuration

#### New Apple Age Rating System (2025)
- **Select**: 18+
- **Questionnaire Responses**:
  - Contains mature/suggestive themes: YES (spiritual/fortune-telling content)
  - Unrestricted web access: NO
  - Simulated gambling: NO
  - Frequent/intense mature themes: YES
  - Contains user-generated content: YES (questions to readers)
  - Allows communication with strangers: YES (reader-client calls)
  - Location sharing: NO
  - Personal information sharing: NO

#### Justification for 18+ Rating
- Service involves spiritual guidance and fortune-telling
- Direct voice communication between users and readers
- Mature themes around life guidance and personal relationships
- Payment processing for premium spiritual services
- User-generated content through questions and voice recordings

### Data Retention & Deletion

#### User Rights
- Users can request data export through in-app settings
- Users can request account deletion through in-app settings  
- Data deletion completed within 30 days per GDPR Article 17
- Immutable audit logs maintained for legal compliance

#### Retention Periods
- Active account data: Retained while account active
- Inactive accounts: Deleted after 24 months
- Payment records: 7 years (legal requirement)
- Audit logs: 7 years (compliance requirement)

### Required App Store Connect Settings

1. **App Privacy Tab**:
   - Complete all data type questions as specified above
   - Link privacy policy URL: https://samiatarot.com/privacy
   - Confirm no tracking across other apps/websites

2. **Age Rating**:
   - Select new 18+ category
   - Complete mature content questionnaire
   - Provide justification for spiritual/fortune-telling content

3. **App Review Information**:
   - Demo account credentials for app review
   - Notes about 18+ spiritual content
   - Contact information for questions

### Privacy Policy Links
- English: https://samiatarot.com/privacy
- Arabic: https://samiatarot.com/ar/privacy

### Data Safety Questions Alignment
Ensure consistency between App Store privacy answers and Google Play Data Safety responses to avoid policy violations.

### Evidence Screenshots
- Save screenshots of all App Store Connect privacy configurations
- Document privacy manifest inclusion in Xcode project
- Archive privacy policy versions with effective dates