import { createContext, useContext, useState, type ReactNode } from 'react';

interface ModalOptions {
  message: string;
  title?: string;
  okText?: string;
  cancelText?: string;
  hideCancel?: boolean;
}

interface ModalContextType {
  confirm: (options: ModalOptions | string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ModalOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (options: ModalOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setModalState({
        isOpen: true,
        options: opts,
        resolve,
      });
    });
  };

  const handleClose = (result: boolean) => {
    if (modalState) {
      modalState.resolve(result);
      setModalState(null);
    }
  };

  return (
    <ModalContext.Provider value={{ confirm }}>
      {children}
      {modalState?.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          opacity: modalState.isOpen ? 1 : 0,
          transition: 'opacity 0.2s ease',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--accent)',
            borderRadius: '12px',
            padding: '20px',
            width: '300px',
            maxWidth: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            transform: modalState.isOpen ? 'scale(1)' : 'scale(0.95)',
            transition: 'transform 0.2s ease',
            animation: 'scaleIn 0.2s ease'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-main)', fontSize: '1.1em' }}>
              {modalState.options.title || 'TesseraDesk'}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9em', whiteSpace: 'pre-line' }}>
              {modalState.options.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {!modalState.options.hideCancel && (
                <button className="action-btn outline" onClick={() => handleClose(false)}>
                  {modalState.options.cancelText || 'Cancel'}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => handleClose(true)}>
                {modalState.options.okText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
