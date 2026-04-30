import { Link } from 'react-router-dom';
import StubPage from '@/shared/components/StubPage';

export default function PartnersPage() {
  return (
    <StubPage
      title="Партнёрам"
      description={
        <>
          По вопросам сотрудничества напишите на{' '}
          <a href="mailto:info@livegrid.ru" className="text-primary underline hover:no-underline">
            info@livegrid.ru
          </a>{' '}
          или откройте раздел{' '}
          <Link to="/contacts" className="text-primary underline hover:no-underline">
            Контакты
          </Link>
          .
        </>
      }
    />
  );
}
