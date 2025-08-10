import React from 'react';
import styles from './PrivacyPolicy.module.css';

const PrivacyPolicyPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <div className={styles.content}>

        <h2 className={styles.subtitle}>Introduction</h2>
        <p>
          Welcome to Ambelie. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
        </p>

        <h2 className={styles.subtitle}>Information We Collect</h2>
        <p>
          We may collect personal information from you such as your name, email address, and payment information when you register for an account, make a purchase, or subscribe to our newsletter.
        </p>

        <h2 className={styles.subtitle}>How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve our services, to process your transactions, to send you promotional information, and to respond to your comments and questions.
        </p>

        <h2 className={styles.subtitle}>Sharing Your Information</h2>
        <p>
          We do not sell, trade, or otherwise transfer to outside parties your Personally Identifiable Information unless we provide users with advance notice. This does not include website hosting partners and other parties who assist us in operating our website, conducting our business, or serving our users, so long as those parties agree to keep this information confidential.
        </p>

        <h2 className={styles.subtitle}>Security of Your Information</h2>
        <p>
          We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
        </p>

        <h2 className={styles.subtitle}>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at support@ambelie.com.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;