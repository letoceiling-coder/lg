import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Building2, Home, TreePine, Store, Trees, Phone, Send, CheckCircle2 } from 'lucide-react';
import { apiPost } from '@/lib/api';

/* ── Step 1 types ── */
const propertyTypes = [
  { label: 'Квартира', icon: Building2, value: 'apartment' },
  { label: 'Дом', icon: Home, value: 'house' },
  { label: 'Участок', icon: TreePine, value: 'land' },
  { label: 'Коммерция', icon: Store, value: 'commercial' },
  { label: 'Дача', icon: Trees, value: 'dacha' },
];

/* ── Step 2 dynamic fields ── */
const regionOptions = ['Москва и МО', 'Санкт-Петербург', 'Краснодарский край', 'Белгород', 'Другой'];
const budgetOptions = ['До 3 млн', '3–7 млн', '7–15 млн', '15–30 млн', '30+ млн'];
const roomOptions = ['Студия', '1', '2', '3', '4+'];
const areaOptions = ['До 6 сот.', '6–10 сот.', '10–20 сот.', '20+ сот.'];
const purposeOptions = ['ИЖС', 'СНТ', 'Коммерция', 'Сельхоз'];
const spaceTypeOptions = ['Офис', 'Торговое', 'Склад', 'Свободное'];
const dachaAreaOptions = ['До 50 м²', '50–100 м²', '100–200 м²', '200+ м²'];

type FieldConfig = { label: string; key: string; options: string[] };

const step2Fields: Record<string, FieldConfig[]> = {
  apartment: [
    { label: 'Регион', key: 'region', options: regionOptions },
    { label: 'Бюджет', key: 'budget', options: budgetOptions },
    { label: 'Комнаты', key: 'rooms', options: roomOptions },
  ],
  house: [
    { label: 'Регион', key: 'region', options: regionOptions },
    { label: 'Бюджет', key: 'budget', options: budgetOptions },
    { label: 'Участок', key: 'area', options: areaOptions },
  ],
  land: [
    { label: 'Регион', key: 'region', options: regionOptions },
    { label: 'Бюджет', key: 'budget', options: budgetOptions },
    { label: 'Назначение', key: 'purpose', options: purposeOptions },
  ],
  commercial: [
    { label: 'Регион', key: 'region', options: regionOptions },
    { label: 'Бюджет', key: 'budget', options: budgetOptions },
    { label: 'Тип', key: 'spaceType', options: spaceTypeOptions },
  ],
  dacha: [
    { label: 'Регион', key: 'region', options: regionOptions },
    { label: 'Бюджет', key: 'budget', options: budgetOptions },
    { label: 'Площадь', key: 'dachaArea', options: dachaAreaOptions },
  ],
};

const QuizSection = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canNext =
    step === 0
      ? !!selectedType
      : step === 1
        ? (step2Fields[selectedType] || []).every(f => !!params[f.key])
        : name.trim().length > 0 && contact.trim().length > 0 && agreed;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const comment = Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(', ');
      await apiPost('/requests', {
        name,
        phone: contact,
        type: 'SELECTION',
        comment: `Тип: ${selectedType}. ${comment}`,
        sourceUrl: window.location.href,
      });
      void queryClient.invalidateQueries({ queryKey: ['requests', 'me'] });
      setSubmitted(true);
    } catch {
      setError('Не удалось отправить заявку. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 2) {
      handleSubmit();
    } else {
      setStep(s => s + 1);
    }
  };

  if (submitted) {
    return (
      <section className="py-8 sm:py-12">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="bg-secondary rounded-xl p-6 sm:p-10 text-center max-w-[600px] mx-auto">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">Отлично!</h2>
            <p className="text-sm text-muted-foreground mb-1">Мы уже подбираем варианты.</p>
            <p className="text-sm text-muted-foreground">Менеджер свяжется с вами в течение 2 часов.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">

          {/* Main quiz card */}
          <div className="flex-1 bg-secondary rounded-xl p-4 sm:p-6">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h2 className="text-base sm:text-xl font-bold">Подберём объект</h2>
              <span className="text-xs text-muted-foreground font-medium">Шаг {step + 1} из 3</span>
            </div>

            {/* Step 1 — Type */}
            {step === 0 && (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">Какой тип недвижимости?</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {propertyTypes.map(pt => {
                    const Icon = pt.icon;
                    const active = selectedType === pt.value;
                    return (
                      <button
                        key={pt.value}
                        onClick={() => setSelectedType(pt.value)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border-2 p-3 sm:p-4 text-left transition-all touch-manipulation',
                          active
                            ? 'border-primary bg-accent'
                            : 'border-border bg-background hover:border-primary/30'
                        )}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium">{pt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Step 2 — Dynamic params */}
            {step === 1 && selectedType && (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">Уточните параметры</p>
                <div className="space-y-3 sm:space-y-4">
                  {step2Fields[selectedType].map(field => (
                    <div key={field.key}>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{field.label}</label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {field.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setParams(p => ({ ...p, [field.key]: opt }))}
                            className={cn(
                              'px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all touch-manipulation',
                              params[field.key] === opt
                                ? 'border-primary bg-accent text-primary'
                                : 'border-border bg-background hover:border-primary/30'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 3 — Contact */}
            {step === 2 && (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">Куда отправить подборку?</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ваше имя"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-10 sm:h-11 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    placeholder="Телефон или Telegram"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    className="w-full h-10 sm:h-11 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <label className="flex items-start gap-2 cursor-pointer touch-manipulation">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Соглашаюсь с обработкой персональных данных и с{' '}
                      <Link to="/privacy" className="text-primary underline hover:text-primary/90" target="_blank" rel="noopener noreferrer">
                        политикой
                      </Link>{' '}
                      конфиденциальности
                    </span>
                  </label>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3 mt-5 sm:mt-6">
              <button
                disabled={step === 0}
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-medium disabled:opacity-30 hover:bg-background transition-colors min-h-[44px] touch-manipulation"
              >
                Назад
              </button>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button
                disabled={!canNext || submitting}
                onClick={handleNext}
                className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-medium min-h-[44px]"
              >
                {submitting ? 'Отправка…' : step === 2 ? 'Получить подборку' : 'Далее'}
              </Button>
            </div>
          </div>

          {/* Right info panel */}
          <div className="hidden lg:flex lg:w-[280px] bg-muted rounded-xl p-5 flex-col gap-5">
            <h3 className="text-sm font-bold">Что вы получите</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm">📋</span>
                </div>
                <div>
                  <p className="text-xs font-semibold">5–10 вариантов</p>
                  <p className="text-[11px] text-muted-foreground">Подобранных под ваш запрос</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm">⚡</span>
                </div>
                <div>
                  <p className="text-xs font-semibold">Подбор за 2 часа</p>
                  <p className="text-[11px] text-muted-foreground">Менеджер начнёт сразу</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Telegram или звонок</p>
                  <p className="text-[11px] text-muted-foreground">Отправим как удобно вам</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Бесплатно</p>
                  <p className="text-[11px] text-muted-foreground">Без комиссий и скрытых платежей</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuizSection;
