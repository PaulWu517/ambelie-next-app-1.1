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
        <div className={styles.loginHeader}>
          <h1>Welcome to Ambelie</h1>
          <p>Enter your email address and we'll send you a verification code to sign in</p>
        </div>

        <LoginForm />
        
        <div className={styles.loginFooter}>
          <p>First-time login will automatically create an account for you</p>
          <p>By signing in, you agree to our <a href="/privacy-policy">Privacy Policy</a> and <a href="/terms">Terms of Service</a></p>
        </div>
      </div>
    </main>
  );
} 