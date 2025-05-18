from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import json
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import os
from dotenv import load_dotenv
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "your-secret-key-here")

# Configuration from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Load property data
PROPERTIES_FILE = 'data/properties.json'

def load_properties():
    try:
        with open(PROPERTIES_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_properties(properties):
    with open(PROPERTIES_FILE, 'w') as f:
        json.dump(properties, f, indent=4)

properties = load_properties()

# Admin login required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Email function
def send_email(to_email, subject, body):
    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        app.logger.error(f"Error sending email: {e}")
        return False

# Chatbot routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_properties', methods=['POST'])
def get_properties():
    data = request.json
    try:
        budget = float(data['budget'])
    except (ValueError, KeyError):
        return jsonify({"error": "Invalid budget"}), 400
    
    # Filter properties within 10% of the budget
    matching_properties = [
        prop for prop in properties 
        if prop['price'] <= budget * 1.1 and prop['price'] >= budget * 0.9
    ]
    
    # If no exact matches, show properties below budget
    if not matching_properties:
        matching_properties = [prop for prop in properties if prop['price'] <= budget]
    
    return jsonify(matching_properties[:3])  # Return max 3 properties

@app.route('/submit_interest', methods=['POST'])
def submit_interest():
    data = request.json
    try:
        property_id = int(data['property_id'])
        name = data['name'].strip()
        email = data['email'].strip()
        phone = data['phone'].strip()
        
        if not all([name, email, phone]):
            return jsonify({"status": "error", "message": "All fields are required"}), 400
    except (KeyError, ValueError):
        return jsonify({"status": "error", "message": "Invalid data"}), 400
    
    # Find the property
    property_info = next((p for p in properties if p['id'] == property_id), None)
    
    if not property_info:
        return jsonify({"status": "error", "message": "Property not found"}), 404
    
    # Prepare email content
    subject = f"New Interest in Property: {property_info['name']}"
    body = f"""
    A potential buyer has shown interest in your property:
    
    Property: {property_info['name']}
    Price: ${property_info['price']:,}
    Location: {property_info['location']}
    
    Buyer Details:
    Name: {name}
    Email: {email}
    Phone: {phone}
    """
    
    # Send email to property owner
    if send_email(property_info['owner_email'], subject, body):
        return jsonify({"status": "success", "message": "Your interest has been submitted successfully!"})
    
    return jsonify({"status": "error", "message": "Failed to submit your interest. Please try again later."}), 500

@app.route('/book_visit', methods=['POST'])
def book_visit():
    data = request.json
    try:
        property_id = int(data['property_id'])
        name = data['name'].strip()
        email = data['email'].strip()
        phone = data['phone'].strip()
        date = data['date'].strip()
        time = data['time'].strip()
        
        if not all([name, email, phone, date, time]):
            return jsonify({"status": "error", "message": "All fields are required"}), 400
    except (KeyError, ValueError):
        return jsonify({"status": "error", "message": "Invalid data"}), 400
    
    # Find the property
    property_info = next((p for p in properties if p['id'] == property_id), None)
    
    if not property_info:
        return jsonify({"status": "error", "message": "Property not found"}), 404
    
    # Prepare email content
    subject = f"Visit Booked for Property: {property_info['name']}"
    body = f"""
    A visit has been booked for your property:
    
    Property: {property_info['name']}
    Price: ${property_info['price']:,}
    Location: {property_info['location']}
    
    Visitor Details:
    Name: {name}
    Email: {email}
    Phone: {phone}
    
    Visit Scheduled for:
    Date: {date}
    Time: {time}
    """
    
    # Send email to property owner
    if send_email(property_info['owner_email'], subject, body):
        return jsonify({"status": "success", "message": "Your visit has been booked successfully!"})
    
    return jsonify({"status": "error", "message": "Failed to book your visit. Please try again later."}), 500

# Admin routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('admin_properties'))
        else:
            return render_template('admin/login.html', error="Invalid credentials")
    
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin_login'))

@app.route('/admin/properties')
@admin_required
def admin_properties():
    return render_template('admin/properties.html', properties=properties)

@app.route('/admin/properties/add', methods=['POST'])
@admin_required
def add_property():
    try:
        new_property = {
            'id': max(p['id'] for p in properties) + 1 if properties else 1,
            'name': request.form['name'].strip(),
            'price': float(request.form['price']),
            'location': request.form['location'].strip(),
            'image': request.form['image'].strip(),
            'description': request.form['description'].strip(),
            'owner_email': request.form['owner_email'].strip(),
            'owner_name': request.form['owner_name'].strip()
        }
        
        if not all(new_property.values()):
            raise ValueError("All fields are required")
            
    except (KeyError, ValueError) as e:
        return render_template('admin/properties.html', 
                             properties=properties,
                             error=f"Invalid data: {str(e)}")
    
    properties.append(new_property)
    save_properties(properties)
    return redirect(url_for('admin_properties'))

@app.route('/admin/properties/delete/<int:property_id>', methods=['POST'])
@admin_required
def delete_property(property_id):
    global properties
    properties = [p for p in properties if p['id'] != property_id]
    save_properties(properties)
    return redirect(url_for('admin_properties'))

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    app.run(debug=True)