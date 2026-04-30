import { Link } from 'react-router-dom';
import StubPage from '@/shared/components/StubPage';

export default function CareerPage() {
  return (
    <StubPage
      title="Карьера"
      description={
        <>
          Актуальные вакансии можно уточнить по телефону в разделе{' '}
          <Link to="/contacts" className="text-primary underline hover:no-underline">
            Контакты
          </Link>{' '}
          или по почте{' '}
          <a href="mailto:info@livegrid.ru" className="text-primary underline hover:no-underline">
            info@livegrid.ru
          </a>
          .
        </>
      }
    />
  );
}
