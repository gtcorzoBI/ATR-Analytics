from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app)

@app.route('/api/send-email', methods=['POST'])
def send_email():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    smtp_settings = data.get('smtpSettings')
    email_details = data.get('emailDetails')

    if not smtp_settings or not email_details:
        return jsonify({"error": "Missing smtpSettings or emailDetails"}), 400

    try:
        host = smtp_settings.get('host')
        port = smtp_settings.get('port')
        user = smtp_settings.get('user')
        password = smtp_settings.get('password')
        from_name = smtp_settings.get('fromName', 'ATR Analytics')

        recipient = email_details.get('recipient')
        subject = email_details.get('subject')
        body = email_details.get('body')

        msg = MIMEMultipart()
        msg['From'] = f"{from_name} <{user}>"
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)

        return jsonify({"success": True, "message": "Email sent successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(port=3002, debug=True)
