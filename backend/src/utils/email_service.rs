use lettre::{
    message::{header::ContentType, Mailbox, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    Message, SmtpTransport, Transport,
};
use chrono::Datelike;
use std::env;

pub async fn send_test_invitation_email(
    recipient_email: &str,
    test_name: &str,
    test_description: Option<&str>,
    test_link: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // Read SMTP configuration from environment
    let smtp_host = env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
    let smtp_port = env::var("SMTP_PORT")
        .unwrap_or_else(|_| "587".to_string())
        .parse::<u16>()
        .unwrap_or(587);
    let smtp_username = env::var("SMTP_USERNAME")?;
    let smtp_password = env::var("SMTP_PASSWORD")?;
    let from_email = env::var("SMTP_FROM_EMAIL").unwrap_or_else(|_| smtp_username.clone());
    let from_name = env::var("SMTP_FROM_NAME").unwrap_or_else(|_| "Nocturnal Surveys".to_string());

    // Build HTML email content
    let description_html = if let Some(desc) = test_description {
        format!(
            r#"
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap;">{}</p>
            </div>
            "#,
            html_escape(desc)
        )
    } else {
        String::new()
    };

    let html_body = format!(
        r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; font-size: 28px; margin: 0 0 10px 0;">You're Invited to Participate!</h1>
            <p style="color: #6b7280; font-size: 16px; margin: 0;">A new test is ready for your feedback</p>
        </div>

        <!-- Test Information -->
        <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 10px 0;">Test: {}</h2>
            {}
        </div>

        <!-- Instructions -->
        <div style="margin: 30px 0;">
            <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">How to Complete This Test:</h3>
            <ol style="color: #374151; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li>Click the button below to access your personalized test link</li>
                <li>Review each media file (audio, video, or image)</li>
                <li>Rate each item using the star rating system (0.5 to 5 stars)</li>
                <li>Optionally add comments to provide additional feedback</li>
                <li>Click "Finish Test" when you've rated all items</li>
            </ol>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
            <a href="{}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Start Test</a>
        </div>

        <!-- Important Notes -->
        <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 30px 0;">
            <p style="color: #78350f; font-size: 14px; margin: 0; font-weight: 500;">
                ⚠️ <strong>Important:</strong> This is a one-time use link. Once you complete the test, this link will expire.
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                If you have any questions or encounter issues, please contact your administrator.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                &copy; {} Nocturnal Surveys. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        "#,
        html_escape(test_name),
        description_html,
        test_link,
        chrono::Utc::now().year()
    );

    // Build plain text version as fallback
    let text_body = format!(
        r#"You're Invited to Participate!

Test: {}
{}

How to Complete This Test:
1. Click the link below to access your personalized test
2. Review each media file (audio, video, or image)
3. Rate each item using the star rating system (0.5 to 5 stars)
4. Optionally add comments to provide additional feedback
5. Click "Finish Test" when you've rated all items

Access your test here:
{}

IMPORTANT: This is a one-time use link. Once you complete the test, this link will expire.

If you have any questions or encounter issues, please contact your administrator.
        "#,
        test_name,
        test_description.map(|d| format!("\nDescription: {}\n", d)).unwrap_or_default(),
        test_link
    );

    // Parse email addresses
    let from_mailbox: Mailbox = format!("{} <{}>", from_name, from_email)
        .parse()
        .map_err(|e| format!("Invalid from email: {}", e))?;

    let to_mailbox: Mailbox = recipient_email
        .parse()
        .map_err(|e| format!("Invalid recipient email: {}", e))?;

    // Build email message with multipart (text + html)
    let email = Message::builder()
        .from(from_mailbox)
        .to(to_mailbox)
        .subject(format!("Invitation: {} - Nocturnal Survey", test_name))
        .multipart(
            MultiPart::alternative()
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(text_body)
                )
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_HTML)
                        .body(html_body)
                )
        )
        .map_err(|e| format!("Failed to build email: {}", e))?;

    // Configure SMTP transport with explicit STARTTLS
    let creds = Credentials::new(smtp_username, smtp_password);

    // Use starttls() instead of relay() for explicit STARTTLS on port 587
    let mailer = SmtpTransport::starttls_relay(&smtp_host)?
        .port(smtp_port)
        .credentials(creds)
        .timeout(Some(std::time::Duration::from_secs(30)))
        .build();

    // Send email
    mailer
        .send(&email)
        .map_err(|e| {
            tracing::error!("Detailed SMTP error: {:?}", e);
            format!("Failed to send email: {}", e)
        })?;

    Ok(())
}

// Helper function to escape HTML special characters
fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}
