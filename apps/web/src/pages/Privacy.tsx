import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';

const Privacy = () => (
  <div className="min-h-screen bg-background pb-16 lg:pb-0">
    <RedesignHeader />
    <div className="max-w-[800px] mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">Политика конфиденциальности</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
        <section>
          <h2 className="text-lg font-bold text-foreground">1. Общие положения</h2>
          <p>Настоящая политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта livegrid.ru (далее — Сайт), принадлежащего ООО «ЛайвГрид» (далее — Оператор).</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">2. Сбор данных</h2>
          <p>Оператор собирает следующие персональные данные: имя, номер телефона, адрес электронной почты, которые пользователь предоставляет добровольно при заполнении форм на Сайте.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">3. Использование данных</h2>
          <p>Персональные данные используются для: обработки заявок, связи с пользователем, улучшения качества обслуживания, отправки информационных сообщений (с согласия пользователя).</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">4. Защита данных</h2>
          <p>Оператор принимает необходимые организационные и технические меры для защиты персональных данных от неправомерного доступа, уничтожения, изменения, блокирования, копирования и распространения.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">5. Куки (Cookies)</h2>
          <p>Сайт использует файлы cookie для обеспечения корректной работы, аналитики и персонализации. Пользователь может отключить cookies в настройках браузера.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">6. Контакты</h2>
          <p>По вопросам, связанным с обработкой персональных данных, обращайтесь: info@livegrid.ru, +7 (904) 539-34-34.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground">7. Согласие на обработку персональных данных</h2>
          <p>
            Отправляя любую форму на сайте, пользователь подтверждает, что добровольно предоставляет
            персональные данные и даёт согласие на их обработку Оператором для обратной связи,
            консультации, подбора недвижимости, сопровождения заявки и исполнения связанных договорённостей.
          </p>
          <p>
            Согласие действует до достижения целей обработки или до его отзыва пользователем.
            Отзыв можно направить на электронную почту Оператора, указанную в разделе контактов.
          </p>
        </section>
      </div>
    </div>
    <FooterSection />
  </div>
);

export default Privacy;
