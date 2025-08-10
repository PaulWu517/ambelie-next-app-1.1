import React from 'react';
import styles from './TermsOfService.module.css';

const TermsOfServicePage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Terms of Service</h1>
      <div className={styles.content}>
        

        <h2 className={styles.subtitle}>1. Agreement to Terms</h2>
        <p>
          By using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
        </p>

        <h2 className={styles.subtitle}>2. Changes to Terms or Services</h2>
        <p>
          We may modify the Terms at any time, in our sole discretion. If we do so, we’ll let you know either by posting the modified Terms on the Site or through other communications. It’s important that you review the Terms whenever we modify them because if you continue to use the Services after we have posted modified Terms on the Site, you are indicating to us that you agree to be bound by the modified Terms.
        </p>

        <h2 className={styles.subtitle}>3. Who May Use the Services</h2>
        <p>
          You may use the Services only if you are 18 years or older and are not barred from using the Services under applicable law.
        </p>

        <h2 className={styles.subtitle}>4. Content Ownership</h2>
        <p>
          We do not claim any ownership rights in any User Content and nothing in these Terms will be deemed to restrict any rights that you may have to use and exploit your User Content.
        </p>

        <h2 className={styles.subtitle}>5. General Prohibitions</h2>
        <p>
          You agree not to do any of the following: post, upload, publish, submit or transmit any Content that: (i) infringes, misappropriates or violates a third party’s patent, copyright, trademark, trade secret, moral rights or other intellectual property rights, or rights of publicity or privacy; (ii) violates, or encourages any conduct that would violate, any applicable law or regulation or would give rise to civil liability; (iii) is fraudulent, false, misleading or deceptive; (iv) is defamatory, obscene, pornographic, vulgar or offensive; (v) promotes discrimination, bigotry, racism, hatred, harassment or harm against any individual or group; (vi) is violent or threatening or promotes violence or actions that are threatening to any person or entity; or (vii) promotes illegal or harmful activities or substances.
        </p>

        <h2 className={styles.subtitle}>Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at support@ambelie.com.
        </p>
      </div>
    </div>
  );
};

export default TermsOfServicePage;