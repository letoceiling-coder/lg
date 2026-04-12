import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import LeadForm from '@/shared/components/LeadForm';

const banks = [
  { name: 'Сбербанк', rate: 5.9, logo: '🏦' },
  { name: 'ВТБ', rate: 6.2, logo: '🏦' },
  { name: 'Альфа-Банк', rate: 6.5, logo: '🏦' },
  { name: 'Райффайзен', rate: 6.8, logo: '🏦' },
];

const Mortgage = () => {
  const [price, setPrice] = useState(6000000);
  const [downPayment, setDownPayment] = useState(20);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(5.9);

  const loanAmount = price * (1 - downPayment / 100);
  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  const monthlyPayment = monthlyRate > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : loanAmount / months;
  const totalPayment = monthlyPayment * months;
  const overpayment = totalPayment - loanAmount;

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Ипотечный калькулятор</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Стоимость недвижимости: {fmt(price)} ₽</label>
                <Slider value={[price]} onValueChange={v => setPrice(v[0])} min={500000} max={50000000} step={100000} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Первоначальный взнос: {downPayment}%</label>
                <Slider value={[downPayment]} onValueChange={v => setDownPayment(v[0])} min={10} max={90} step={1} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Срок: {years} лет</label>
                <Slider value={[years]} onValueChange={v => setYears(v[0])} min={1} max={30} step={1} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ставка, %</label>
                <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} step={0.1} min={0.1} max={30} className="w-32 h-11" />
              </div>
            </div>

            {/* Results */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Ежемесячный платёж</p>
                <p className="text-xl font-bold text-primary">{fmt(monthlyPayment)} ₽</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Сумма кредита</p>
                <p className="text-xl font-bold">{fmt(loanAmount)} ₽</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Переплата</p>
                <p className="text-xl font-bold text-destructive">{fmt(overpayment)} ₽</p>
              </div>
            </div>

            {/* Banks */}
            <div>
              <h2 className="text-lg font-bold mb-4">Предложения банков</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {banks.map(b => (
                  <div key={b.name} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                    <span className="text-2xl">{b.logo}</span>
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">от {b.rate}% годовых</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <LeadForm title="Подобрать ипотеку" source="mortgage" />
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Mortgage;
