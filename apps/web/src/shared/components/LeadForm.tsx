import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle } from 'lucide-react';
import { apiPost, ApiError } from '@/lib/api';

type PublicRequestType =
  | 'CONSULTATION'
  | 'MORTGAGE'
  | 'CALLBACK'
  | 'SELECTION'
  | 'CONTACT';

interface Props {
  title?: string;
  /** Короткая метка для комментария (страница / сценарий). */
  source?: string;
  className?: string;
  requestType?: PublicRequestType;
  blockId?: number;
  listingId?: number;
}

function inferRequestType(source: string): PublicRequestType {
  if (source === 'mortgage') return 'MORTGAGE';
  if (source === 'contacts') return 'CONTACT';
  return 'CONSULTATION';
}

const LeadForm = ({
  title = 'Получить консультацию',
  source = 'lead_form',
  className = '',
  requestType: requestTypeProp,
  blockId,
  listingId,
}: Props) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    setError('');
    const type = requestTypeProp ?? inferRequestType(source);
    const commentPayload =
      [comment.trim(), source && source !== 'lead_form' ? `Источник формы: ${source}` : '']
        .filter(Boolean)
        .join('\n\n') || undefined;
    try {
      await apiPost('/requests', {
        name: name.trim(),
        phone: phone.trim(),
        type,
        comment: commentPayload,
        sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        ...(blockId != null ? { blockId } : {}),
        ...(listingId != null ? { listingId } : {}),
      });
      setSubmitted(true);
    } catch (err) {
      let msg = 'Не удалось отправить заявку. Попробуйте позже.';
      if (err instanceof ApiError) {
        try {
          const j = JSON.parse(err.message) as { message?: string };
          if (j?.message) msg = j.message;
        } catch {
          if (err.message) msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`bg-card border border-border rounded-xl p-6 sm:p-8 text-center ${className}`}>
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-1">Спасибо!</h3>
        <p className="text-sm text-muted-foreground">Менеджер свяжется в течение 2 часов</p>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-xl p-6 sm:p-8 ${className}`}>
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Имя"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="h-11"
        />
        <Input
          type="tel"
          placeholder="Телефон"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
          className="h-11"
        />
        <Textarea
          placeholder="Комментарий (необязательно)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Нажимая кнопку, вы соглашаетесь с{' '}
          <a href="/privacy" className="underline hover:text-foreground">политикой конфиденциальности</a>
        </p>
      </form>
    </div>
  );
};

export default LeadForm;
