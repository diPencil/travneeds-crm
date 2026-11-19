import { useState } from 'react';
import { Shield, Lock } from 'lucide-react';
import type { UserDirectory } from '../../../shared/users/users.contracts';
import { useApiResource } from '../../lib/http/useApiResource';
import { useLocale } from '../../localization/useLocale';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { DataState } from '../../components/ui/DataState';

export function RolesPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const resource = useApiResource<UserDirectory>('/users');
  const [selected, setSelected] = useState<'admin' | 'employee'>('admin');
  if (!user?.roles.includes('admin'))
    return <PageHeader title={isRTL ? 'غير مصرح' : 'Access denied'} />;
  return (
    <div className="page-container">
      <PageHeader
        title={isRTL ? 'مصفوفة الصلاحيات' : 'Access Control Matrix'}
        description={
          isRTL ? 'الأدوار الفعلية المطبقة على السيرفر' : 'System roles enforced by the server'
        }
      />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          {(['admin', 'employee'] as const).map((role) => (
            <button
              key={role}
              className={`w-full text-start rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${selected === role ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelected(role)}
            >
              <Card>
                <CardContent>
                  <Shield className="w-6 h-6 text-blue-600 mb-4" />
                  <h2 className="font-bold">
                    {role === 'admin'
                      ? isRTL
                        ? 'مدير النظام'
                        : 'Administrator'
                      : isRTL
                        ? 'موظف'
                        : 'Employee'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    {resource.data?.users.filter((item) => item.roles.includes(role)).length ?? '—'}{' '}
                    {isRTL ? 'حساب' : 'accounts'}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
        <Card className="lg:col-span-2">
          <CardContent>
            <h2 className="font-bold text-lg mb-6 flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600" />
              {isRTL ? 'الصلاحيات' : 'Permissions'}
            </h2>
            <ul className="space-y-4 text-sm">
              <li>
                {isRTL
                  ? 'إدارة بيانات CRM: إضافة وقراءة وتعديل'
                  : 'CRM records: create, read and update'}
              </li>
              <li>
                {isRTL
                  ? 'الحساب الشخصي والإشعارات وسجل النشاط الشخصي'
                  : 'Own profile, notifications and personal audit history'}
              </li>
              {selected === 'admin' && (
                <>
                  <li>
                    {isRTL
                      ? 'إدارة المستخدمين والأدوار والجلسات والدعوات'
                      : 'Manage users, roles, sessions and invitations'}
                  </li>
                  <li>
                    {isRTL
                      ? 'إعدادات المشروع وسجل النظام وأرشفة سجلات CRM'
                      : 'Project settings, system audit and CRM record archiving'}
                  </li>
                </>
              )}
            </ul>
            <p className="text-xs text-gray-500 mt-8">
              {isRTL
                ? 'تغيير دور الحساب يتم من تعديل المستخدم. الأدوار الحالية ثابتة ومطبقة فعليًا.'
                : 'Assign a role from Edit User. These built-in roles match actual server checks.'}
            </p>
          </CardContent>
        </Card>
      </div>
      <DataState {...resource} retry={resource.reload} />
    </div>
  );
}
