import { emptyLocalized } from '../../../shared/quotations/quotation.contracts';
import type { QuotationContent } from '../../../shared/quotations/quotation.contracts';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  QuotationRows,
  QuotationRow,
  QuotationLocalizedField,
  QuotationImageField,
} from './QuotationFields';
import type { QuotationTabProps } from './quotation-editor.types';
import { useQuotationText } from './quotation.labels';

export function QuotationMediaTab({
  content,
  setContent,
  language,
  onUploadState,
}: QuotationTabProps) {
  const { text } = useQuotationText();
  return (
    <div className="space-y-10">
      <p className="text-sm text-gray-500">
        {text(
          'The first gallery image is the cover. Maximum total quotation image size is 24 MB. Images stay private behind the authenticated quotation or its share link.',
          'أول صورة هي الغلاف. الحد الإجمالي لصور الكوتيشن 24 ميجابايت. الصور خاصة ولا تُتاح إلا للحساب المصرّح له أو عبر رابط مشاركة الكوتيشن.',
        )}
      </p>
      <QuotationRows
        title={text('Photo gallery', 'معرض الصور')}
        disabled={content.gallery.length >= 24}
        onAdd={() =>
          setContent((previous) => ({
            ...previous,
            gallery: [
              ...previous.gallery,
              {
                id: crypto.randomUUID(),
                mediaId: '',
                alt: emptyLocalized(),
                creditLabel: '',
                creditUrl: '',
              },
            ],
          }))
        }
      >
        {content.gallery.map((item, index) => {
          const update = (patch: Partial<typeof item>) =>
            setContent((previous) => ({
              ...previous,
              gallery: previous.gallery.map((row) =>
                row.id === item.id ? { ...row, ...patch } : row,
              ),
            }));
          return (
            <QuotationRow
              key={item.id}
              title={`${index === 0 ? text('Cover', 'الغلاف') : text('Photo', 'صورة')} ${index + 1}`}
              onRemove={() =>
                setContent((previous) => ({
                  ...previous,
                  gallery: previous.gallery.filter((row) => row.id !== item.id),
                }))
              }
            >
              <QuotationImageField
                label={text('Image', 'الصورة')}
                value={item.mediaId}
                onUploadState={onUploadState}
                onChange={(mediaId) => update({ mediaId })}
              />
              <QuotationLocalizedField
                label={text('Image description / caption', 'وصف الصورة')}
                value={item.alt}
                language={language}
                maxLength={500}
                onChange={(alt) => update({ alt })}
              />
              <div className="grid md:grid-cols-2 gap-5">
                <Input
                  id={`gallery-${item.id}-credit`}
                  label={text('Photo credit', 'مصدر الصورة')}
                  value={item.creditLabel}
                  maxLength={200}
                  onChange={(event) => update({ creditLabel: event.target.value })}
                />
                <Input
                  id={`gallery-${item.id}-url`}
                  label={text('Credit URL (HTTPS)', 'رابط المصدر (HTTPS)')}
                  type="url"
                  value={item.creditUrl}
                  onChange={(event) => update({ creditUrl: event.target.value })}
                />
              </div>
              {index > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setContent((previous) => ({
                      ...previous,
                      gallery: [item, ...previous.gallery.filter((row) => row.id !== item.id)],
                    }))
                  }
                >
                  {text('Use as cover', 'تعيين كغلاف')}
                </Button>
              )}
            </QuotationRow>
          );
        })}
      </QuotationRows>
      <QuotationRows
        title={text('Journey videos', 'فيديوهات الرحلة')}
        disabled={content.videos.length >= 30}
        onAdd={() =>
          setContent((previous) => ({
            ...previous,
            videos: [
              ...previous.videos,
              {
                id: crypto.randomUUID(),
                url: '',
                platform: 'youtube',
                title: emptyLocalized(),
                publishedOn: '',
                thumbnail: '',
              },
            ],
          }))
        }
      >
        {content.videos.map((item, index) => {
          const update = (patch: Partial<typeof item>) =>
            setContent((previous) => ({
              ...previous,
              videos: previous.videos.map((row) =>
                row.id === item.id ? { ...row, ...patch } : row,
              ),
            }));
          return (
            <QuotationRow
              key={item.id}
              title={`${text('Video', 'فيديو')} ${index + 1}`}
              onRemove={() =>
                setContent((previous) => ({
                  ...previous,
                  videos: previous.videos.filter((row) => row.id !== item.id),
                }))
              }
            >
              <div className="grid md:grid-cols-2 gap-5">
                <QuotationLocalizedField
                  label={text('Video title', 'عنوان الفيديو')}
                  value={item.title}
                  language={language}
                  maxLength={200}
                  onChange={(title) => update({ title })}
                />
                <Input
                  id={`video-${item.id}-url`}
                  label={text('Video URL (HTTPS)', 'رابط الفيديو (HTTPS)')}
                  type="url"
                  value={item.url}
                  onChange={(event) => update({ url: event.target.value })}
                />
                <Select
                  id={`video-${item.id}-platform`}
                  label={text('Platform', 'المنصة')}
                  value={item.platform}
                  onChange={(event) =>
                    update({
                      platform: event.target
                        .value as QuotationContent['videos'][number]['platform'],
                    })
                  }
                >
                  {['youtube', 'instagram', 'tiktok', 'facebook', 'vimeo', 'direct'].map(
                    (platform) => (
                      <option key={platform}>{platform}</option>
                    ),
                  )}
                </Select>
                <Input
                  id={`video-${item.id}-date`}
                  label={text('Published date', 'تاريخ النشر')}
                  type="date"
                  value={item.publishedOn}
                  onChange={(event) => update({ publishedOn: event.target.value })}
                />
              </div>
              <QuotationImageField
                label={text('Video poster', 'غلاف الفيديو')}
                value={item.thumbnail}
                onUploadState={onUploadState}
                onChange={(thumbnail) => update({ thumbnail })}
              />
            </QuotationRow>
          );
        })}
      </QuotationRows>
    </div>
  );
}
export function QuotationMapTab({ content, setContent, language }: QuotationTabProps) {
  const { text } = useQuotationText();
  return (
    <QuotationRows
      title={text('Journey locations', 'مواقع الرحلة')}
      disabled={content.locations.length >= 60}
      onAdd={() =>
        setContent((previous) => ({
          ...previous,
          locations: [
            ...previous.locations,
            { id: crypto.randomUUID(), name: emptyLocalized(), latitude: '', longitude: '' },
          ],
        }))
      }
    >
      {content.locations.map((item, index) => {
        const update = (patch: Partial<typeof item>) =>
          setContent((previous) => ({
            ...previous,
            locations: previous.locations.map((row) =>
              row.id === item.id ? { ...row, ...patch } : row,
            ),
          }));
        return (
          <QuotationRow
            key={item.id}
            title={`${text('Location', 'موقع')} ${index + 1}`}
            onRemove={() =>
              setContent((previous) => ({
                ...previous,
                locations: previous.locations.filter((row) => row.id !== item.id),
              }))
            }
          >
            <div className="grid md:grid-cols-3 gap-5">
              <QuotationLocalizedField
                label={text('Location name', 'اسم الموقع')}
                value={item.name}
                language={language}
                maxLength={200}
                onChange={(name) => update({ name })}
              />
              <Input
                id={`map-${item.id}-lat`}
                label={text('Latitude', 'خط العرض')}
                inputMode="decimal"
                value={item.latitude}
                onChange={(event) => update({ latitude: event.target.value })}
              />
              <Input
                id={`map-${item.id}-lng`}
                label={text('Longitude', 'خط الطول')}
                inputMode="decimal"
                value={item.longitude}
                onChange={(event) => update({ longitude: event.target.value })}
              />
            </div>
          </QuotationRow>
        );
      })}
    </QuotationRows>
  );
}
