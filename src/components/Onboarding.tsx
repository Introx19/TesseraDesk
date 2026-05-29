import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Globe, ArrowLeft } from 'lucide-react';

export default function Onboarding() {
  const { language, updateSettings } = useSettings();
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [langPicked, setLangPicked] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('tesseradesk-tutorial-seen')) {
        setIsVisible(true);
    }
    
    const trigger = () => {
      setStep(0);
      setLangPicked(true);
      setIsVisible(true);
    };
    window.addEventListener('trigger-onboarding', trigger);
    return () => window.removeEventListener('trigger-onboarding', trigger);
  }, []);

  const stepsRu = [
    { target: null, title: 'Добро пожаловать в TesseraDesk', text: 'Давайте пройдем быстрое обучение по всем функциям! (Hub версия 1.0)' },
    { target: 'nav-stopwatch', title: 'Управление Временем', text: '✔ Секундомер и Pomodoro-таймер для фокуса.' },
    { target: 'nav-minitimer', title: 'Мини-таймер', text: '✔ Компактный плавающий таймер для рабочего стола.' },
    { target: 'nav-reminders', title: 'Напоминания', text: '✔ Оставляйте себе будильники и важные заметки по времени.' },
    { target: 'nav-calc', title: 'Калькулятор', text: '✔ Быстрый калькулятор всегда под рукой.' },
    { target: 'nav-tasks', title: 'Управление делами', text: '✔ Встроенный список задач и умные заметки.' },
    { target: 'nav-notes', title: 'Заметки', text: '✔ Текстовые документы для важной информации.' },
    { target: 'nav-screenshot', title: 'Скриншоты', text: '✔ Мгновенные снимки экрана.' },
    { target: 'nav-paint', title: 'Рисование (Paint)', text: '✔ Обрезайте и редактируйте скриншоты в Paint.' },
    { target: 'nav-dnd', title: 'Режим Не Беспокоить', text: '✔ Отключает все звуковые оповещения.' },
    { target: 'nav-opacity', title: 'Прозрачность', text: '✔ ЛКМ - Вкл/Выкл прозрачность фона.\n✔ ПКМ - Детальная настройка ползунком.' },
    { target: 'nav-settings', title: 'Настройки и Доп. контент', text: '✔ Тут настройки!\nВо вкладке "Доп. контент" можно бесплатно включить: Таблицу Менделеева, Графики и Решатель Интегралов!' },
    { target: null, title: 'Готово!', text: '✔ Любое окно можно вытащить отдельно (зажать СКМ или кнопку булавки).\n✔ Повторное нажатие на горячую клавишу закрывает окно.' }
  ];

  const stepsEn = [
    { target: null, title: 'Welcome to TesseraDesk', text: 'Let\'s take a quick tour of all features! (Hub Version 1.0)' },
    { target: 'nav-stopwatch', title: 'Time Management', text: '✔ Stopwatch and Pomodoro timer for deep focus.' },
    { target: 'nav-minitimer', title: 'Mini Timer', text: '✔ Compact floating timer for your desktop.' },
    { target: 'nav-reminders', title: 'Reminders', text: '✔ Set alarms and time-based important notes.' },
    { target: 'nav-calc', title: 'Calculator', text: '✔ Quick calculator always at hand.' },
    { target: 'nav-tasks', title: 'Task Management', text: '✔ Built-in task list and organization.' },
    { target: 'nav-notes', title: 'Notes', text: '✔ Text documents for important info.' },
    { target: 'nav-screenshot', title: 'Screenshots', text: '✔ Instant screen captures.' },
    { target: 'nav-paint', title: 'Paint', text: '✔ Crop and edit screenshots directly in Paint.' },
    { target: 'nav-dnd', title: 'Do Not Disturb', text: '✔ Disables all sound notifications.' },
    { target: 'nav-opacity', title: 'UI Opacity', text: '✔ Left Click - Toggle background transparency.\n✔ Right Click - Fine-tune with a slider.' },
    { target: 'nav-settings', title: 'Settings & DLC Tools', text: '✔ Here are the settings!\nIn the "DLC Tools" tab you can enable: Periodic Table, Formulas, Graphs and Integrals solver!' },
    { target: null, title: 'All Set!', text: '✔ Any window can be detached as a floating widget (Middle Click or Pin button).\n✔ Pressing a global shortcut again closes the matching window.' }
  ];

  const steps = language === 'ru' ? stepsRu : stepsEn;
  const currentStepInfo = steps[step];

  useEffect(() => {
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    if (langPicked && currentStepInfo?.target) {
      // Small delay to allow react rendering 
      setTimeout(() => {
        const el = document.getElementById(currentStepInfo.target!);
        if (el) {
          el.classList.add('onboarding-highlight');
          setTargetRect(el.getBoundingClientRect());
        } else {
          // If element doesn't exist (e.g. disabled tool), skip to next
          if (step < steps.length - 1) {
             setStep(s => s + 1);
          }
          setTargetRect(null);
        }
      }, 50);
    } else {
      setTargetRect(null);
    }
  }, [step, langPicked, currentStepInfo]);

  if (!isVisible) return null;

  const close = () => {
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    localStorage.setItem('tesseradesk-tutorial-seen', 'true');
    setIsVisible(false);
  };

  const hasHole = langPicked && !!targetRect;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 9999, 
      background: hasHole ? 'transparent' : 'rgba(0,0,0,0.85)',
      pointerEvents: 'auto', overflow: 'hidden',
      display: hasHole ? 'block' : 'flex', 
      alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s'
    }}>
      {hasHole && (
        <div style={{
          position: 'absolute',
          top: targetRect.top - 5, left: targetRect.left - 5,
          width: targetRect.width + 10, height: targetRect.height + 10,
          border: '2px solid var(--accent)', borderRadius: '8px',
          boxShadow: '0 0 15px var(--accent-glow), 0 0 0 9999px rgba(0,0,0,0.85)',
          pointerEvents: 'none', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }} />
      )}
      {!langPicked ? (
        <div style={{
          background: 'var(--bg-main)', width: '380px', padding: '25px', borderRadius: '16px',
          border: '1px solid var(--glass-border)', textAlign: 'center', boxShadow: '0 0 50px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Globe size={48} style={{ margin: '0 auto', color: 'var(--accent)' }} />
            <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Select Language<br/><span style={{ fontSize: '0.8em', color: '#aaaaaa' }}>Выберите язык</span></h2>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`panel ${language === 'en' ? 'active' : ''}`}
                style={{ flex: 1, padding: '20px', cursor: 'pointer', border: language === 'en' ? '2px solid var(--accent)' : '1px solid var(--glass-border)', color: 'var(--text-main)' }}
                onClick={() => updateSettings({ language: 'en' })}
              >
                <div style={{ fontSize: '2em', marginBottom: '10px' }}>🇬🇧</div>
                <div style={{ fontWeight: 'bold' }}>English</div>
              </button>
              
              <button 
                className={`panel ${language === 'ru' ? 'active' : ''}`}
                style={{ flex: 1, padding: '20px', cursor: 'pointer', border: language === 'ru' ? '2px solid var(--accent)' : '1px solid var(--glass-border)', color: 'var(--text-main)' }}
                onClick={() => updateSettings({ language: 'ru' })}
              >
                <div style={{ fontSize: '2em', marginBottom: '10px' }}>🇷🇺</div>
                <div style={{ fontWeight: 'bold' }}>Русский</div>
              </button>
            </div>
            
            <button className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }} onClick={() => setLangPicked(true)}>
              {language === 'ru' ? 'Продолжить' : 'Continue'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          position: targetRect ? 'absolute' : 'relative',
          top: targetRect ? Math.min(targetRect.top - 20, window.innerHeight - 250) : 'auto',
          left: targetRect ? targetRect.right + 20 : 'auto',
          background: 'var(--bg-main)', width: '350px', padding: '20px', borderRadius: '12px',
          border: '1px solid var(--accent)', textAlign: 'left', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.6), 0 0 0 1px var(--accent-glow)',
          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
          {targetRect && (
            <div style={{ position: 'absolute', left: '-25px', top: targetRect.top - Math.min(targetRect.top - 20, window.innerHeight - 250) + 10, color: 'var(--accent)' }}>
              <ArrowLeft size={30} fill="currentColor" />
            </div>
          )}
          
          <h3 style={{ marginTop: 0, color: 'var(--accent)', fontSize: '1.2em' }}>{currentStepInfo?.title}</h3>
          <div style={{ color: 'var(--text-main)', fontSize: '0.95em', minHeight: '60px', whiteSpace: 'pre-line' }}>{currentStepInfo?.text}</div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '15px' }}>
            {steps.map((_, i) => (
               <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === step ? 'var(--accent)' : 'var(--glass-border)' }}></div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="action-btn outline" onClick={close} style={{ padding: '4px 12px', fontSize: '0.9em' }}>
              {language === 'ru' ? 'Пропустить' : 'Skip'}
            </button>
            {step < steps.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
                {language === 'ru' ? 'Далее' : 'Next'}
              </button>
            ) : (
               <button className="btn btn-primary" onClick={close}>
                {language === 'ru' ? 'Начать работу!' : 'Get Started!'}
               </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
