import React from 'react';
import { APP_INFO, DEVELOPER_INFO } from '../../constants';

interface AboutSettingsProps {
}

const AboutSettings: React.FC<AboutSettingsProps> = () => {
  return (
    <div className="page-section">
      <div className="page-section-title">关于</div>

      <div className="about-card">
        <div className="about-header">
          <div className="about-logo">📁</div>
          <div className="about-header-info">
            <div className="about-name">{APP_INFO.NAME}</div>
            <div className="about-version">版本 {APP_INFO.VERSION}</div>
            <div className="about-tagline">{APP_INFO.TAGLINE}</div>
          </div>
        </div>

        <div className="about-info-grid">
          <div className="about-info-item">
            <div className="about-info-label">开发者</div>
            <div className="about-info-value">{DEVELOPER_INFO.AUTHOR}</div>
          </div>
          <div className="about-info-item">
            <div className="about-info-label">联系我们</div>
            <div className="about-info-value">{DEVELOPER_INFO.CONTACT_EMAIL}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSettings;