import LoginForm from './LoginForm';
import styles from './login.module.css';

export const metadata = {
  title: "Sign In | Ambelie",
  description: "Sign in to your Ambelie account for a personalized art shopping experience",
};

export default function LoginPage() {
  return (
    <main className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <LoginForm />
        
        <div className={styles.loginFooter}>
          <p><a href="/auth/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> &nbsp;&nbsp;&nbsp;&nbsp; <a href="/auth/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a></p>
        </div>
      </div>
    </main>
  );
}