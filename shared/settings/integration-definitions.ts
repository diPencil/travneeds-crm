import type { IntegrationProvider } from './integrations.contracts.js';

export interface IntegrationField {
  key: string;
  label: [string, string];
  kind?: 'number' | 'email' | 'host' | 'identifier';
  secret?: boolean;
  required?: boolean;
  options?: string[];
  default?: string;
}
export interface IntegrationDefinition {
  title: [string, string];
  fields: IntegrationField[];
}
const metaFields: IntegrationField[] = [
  {
    key: 'accountId',
    label: ['Business channel account ID', 'معرّف حساب قناة الأعمال'],
    kind: 'identifier',
    required: true,
  },
  {
    key: 'apiVersion',
    label: ['Graph API version', 'إصدار Graph API'],
    default: 'v27.0',
    required: true,
  },
  { key: 'accessToken', label: ['Access token', 'رمز الوصول'], secret: true, required: true },
  { key: 'appSecret', label: ['Meta app secret', 'سر تطبيق Meta'], secret: true, required: true },
  {
    key: 'verifyToken',
    label: ['Webhook verification token', 'رمز التحقق من Webhook'],
    secret: true,
    required: true,
  },
];
export const integrationDefinitions: Record<IntegrationProvider, IntegrationDefinition> = {
  smtp: {
    title: ['Email Configuration', 'إعدادات البريد'],
    fields: [
      { key: 'host', label: ['SMTP host', 'خادم SMTP'], kind: 'host', required: true },
      {
        key: 'port',
        label: ['SMTP port', 'منفذ SMTP'],
        kind: 'number',
        default: '587',
        required: true,
      },
      {
        key: 'encryption',
        label: ['SMTP encryption', 'تشفير SMTP'],
        options: ['starttls', 'tls'],
        default: 'starttls',
        required: true,
      },
      { key: 'username', label: ['SMTP username', 'اسم مستخدم SMTP'], required: true },
      { key: 'password', label: ['SMTP password', 'كلمة مرور SMTP'], secret: true, required: true },
      { key: 'fromName', label: ['Sender name', 'اسم المرسل'], required: true },
      { key: 'fromEmail', label: ['Sender email', 'بريد المرسل'], kind: 'email', required: true },
      { key: 'replyTo', label: ['Reply-to email', 'بريد الرد'], kind: 'email' },
      {
        key: 'timeout',
        label: ['Connection timeout (seconds)', 'مهلة الاتصال بالثواني'],
        kind: 'number',
        default: '15',
      },
      { key: 'mailbox', label: ['Mailbox label', 'اسم صندوق البريد'] },
      { key: 'imapHost', label: ['Incoming mail host', 'خادم البريد الوارد'], kind: 'host' },
      { key: 'imapPort', label: ['Incoming mail port', 'منفذ البريد الوارد'], kind: 'number' },
      {
        key: 'imapEncryption',
        label: ['Incoming encryption', 'تشفير الوارد'],
        options: ['', 'tls', 'starttls'],
        default: '',
      },
      { key: 'imapUsername', label: ['Incoming mail username', 'اسم مستخدم الوارد'] },
      { key: 'imapPassword', label: ['Incoming mail password', 'كلمة مرور الوارد'], secret: true },
    ],
  },
  google: {
    title: ['Google Login', 'تسجيل الدخول بـ Google'],
    fields: [
      { key: 'clientId', label: ['OAuth client ID', 'معرّف عميل OAuth'], required: true },
      {
        key: 'clientSecret',
        label: ['OAuth client secret', 'سر عميل OAuth'],
        secret: true,
        required: true,
      },
    ],
  },
  translation: {
    title: ['Content Translation', 'ترجمة المحتوى'],
    fields: [
      {
        key: 'provider',
        label: ['Translation provider', 'مزوّد الترجمة'],
        options: ['google-cloud'],
        default: 'google-cloud',
        required: true,
      },
      {
        key: 'apiKey',
        label: ['Google Cloud Translation API key', 'مفتاح Google Cloud Translation'],
        secret: true,
        required: true,
      },
    ],
  },
  messenger: { title: ['Facebook Messenger', 'فيسبوك ماسنجر'], fields: metaFields },
  instagram: { title: ['Instagram', 'إنستجرام'], fields: metaFields },
  whatsapp: {
    title: ['WhatsApp Business', 'واتساب للأعمال'],
    fields: [
      ...metaFields,
      {
        key: 'businessAccountId',
        label: ['WhatsApp Business account ID', 'معرّف حساب واتساب للأعمال'],
        kind: 'identifier',
        required: true,
      },
    ],
  },
};
