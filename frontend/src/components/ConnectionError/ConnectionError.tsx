import styles from './ConnectionError.module.css';

interface ConnectionErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ConnectionError({ message, onRetry }: ConnectionErrorProps) {
  return (
    <div className={styles.container}>
      <img src="/logo.png" alt="KAKAoke" className={styles.logo} />
      <div className={styles.errorBox}>
        <span className={styles.errorTitle}>Connection Error</span>
        <span className={styles.errorMessage}>{message}</span>
        {onRetry && (
          <button className={styles.retryButton} onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
