import { buildPasswordResetEmailContent } from '../../src/services/email/templates/passwordResetEmail';
import { resolveDashboardLoginUrl } from '../../src/utils/dashboardUrl';

describe('passwordResetEmail template', () => {
  it('includes reset link and dashboard login URL', () => {
    const content = buildPasswordResetEmailContent({
      resetLink: 'https://askwhatsappbot.firebaseapp.com/__/auth/action?mode=resetPassword',
      loginUrl: 'https://dashboard.askadonai.com/login',
      recipientEmail: 'staff@example.com',
    });

    expect(content.subject).toContain('Reset your');
    expect(content.html).toContain('staff@example.com');
    expect(content.html).toContain('https://dashboard.askadonai.com/login');
    expect(content.text).toContain('https://askwhatsappbot.firebaseapp.com/__/auth/action');
  });
});

describe('resolveDashboardLoginUrl', () => {
  const originalDashboardUrl = process.env.DASHBOARD_URL;

  afterEach(() => {
    if (originalDashboardUrl === undefined) {
      delete process.env.DASHBOARD_URL;
    } else {
      process.env.DASHBOARD_URL = originalDashboardUrl;
    }
  });

  it('uses DASHBOARD_URL when set', () => {
    process.env.DASHBOARD_URL = 'https://dashboard.askadonai.com';
    expect(resolveDashboardLoginUrl()).toBe('https://dashboard.askadonai.com/login');
  });
});
