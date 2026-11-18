import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { workspaceSections, type WorkspaceSection } from '../../config/workspace';
import { useLocale } from '../../localization/useLocale';
import { useAuth } from '../auth/useAuth';

interface WorkspacePageProps {
  section?: WorkspaceSection;
  notFound?: boolean;
}

export function WorkspacePage({ section, notFound = false }: WorkspacePageProps) {
  const { t } = useLocale();
  const { user } = useAuth();

  if (section?.adminOnly && !user?.roles.includes('admin')) {
    return <PageHeader title={t('settings.forbidden')} />;
  }

  if (notFound) {
    return (
      <div className="page-container">
        <PageHeader title={t('workspace.notFound')} />
        <Card>
          <CardContent>
            <Link to="/" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {t('workspace.backHome')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (section) {
    return (
      <div className="page-container">
        <PageHeader title={t(section.titleKey)} description={t(section.descriptionKey)} />
        <Card>
          <CardContent>
            <p className="description-sm">{t('workspace.empty')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title={t('workspace.title')} description={t('workspace.description')} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {workspaceSections
          .filter((item) => !item.adminOnly || user?.roles.includes('admin'))
          .map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t(item.titleKey)}
                  </h2>
                  <p className="description-sm mt-2">{t(item.descriptionKey)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
