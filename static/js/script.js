document.addEventListener('DOMContentLoaded', function() {
    const chatbotLauncher = document.querySelector('.chatbot-launcher');
    const chatbotContainer = document.querySelector('.chatbot-container');
    const closeBtn = document.querySelector('.close-btn');
    const chatBody = document.getElementById('chatbot-body');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    let currentStep = 'ask_budget';
    let selectedProperty = null;
    
    // Toggle chatbot visibility
    chatbotLauncher.addEventListener('click', function() {
        chatbotContainer.classList.toggle('active');
    });
    
    closeBtn.addEventListener('click', function() {
        chatbotContainer.classList.remove('active');
    });
    
    // Send message when button is clicked
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message when Enter key is pressed
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        
        // Add user message to chat
        addMessage(message, 'user');
        userInput.value = '';
        
        // Process user input based on current step
        switch(currentStep) {
            case 'ask_budget':
                processBudget(message);
                break;
            case 'ask_interest':
                processInterest(message);
                break;
            case 'collect_info':
                processInfo(message);
                break;
            case 'book_visit':
                processBooking(message);
                break;
            case 'ask_more_properties':
                if (message.toLowerCase().includes('yes') || 
                    message.toLowerCase().includes('more') || 
                    message.toLowerCase().includes('another')) {
                    addMessage("Great! What's your updated budget? (You can say the same amount again)", 'bot');
                    currentStep = 'ask_budget';
                } else {
                    addMessage("Thanks for using our service! Type 'hi' or your budget amount if you need anything else.", 'bot');
                    currentStep = 'initial';
                }
                break;
            case 'initial':
                if (message.toLowerCase().includes('hi') || message.toLowerCase().includes('hello')) {
                    addMessage("Welcome back! What's your budget for a property?", 'bot');
                    currentStep = 'ask_budget';
                } else if (!isNaN(parseFloat(message))) {
                    processBudget(message);
                } else {
                    addMessage("Hello! I'm your real estate assistant. What's your budget for a property?", 'bot');
                    currentStep = 'ask_budget';
                }
                break;
            default:
                addMessage("I'm not sure how to respond to that. Could you rephrase?", 'bot');
        }
    }
    
    function addMessage(text, sender, isHTML = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isHTML) {
            contentDiv.innerHTML = text;
        } else {
            contentDiv.innerHTML = `<p>${text}</p>`;
        }
        
        messageDiv.appendChild(contentDiv);
        chatBody.appendChild(messageDiv);
        
        // Scroll to bottom
        chatBody.scrollTop = chatBody.scrollHeight;
    }
    
    function processBudget(budgetInput) {
        const budget = parseFloat(budgetInput.replace(/[^0-9.]/g, ''));
        
        if (isNaN(budget)) {
            addMessage("Please enter a valid budget amount (e.g., 500000).", 'bot');
            return;
        }
        
        // Show loading message
        addMessage("Searching for properties matching your budget...", 'bot');
        
        // Fetch properties from backend
        fetch('/get_properties', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ budget: budget })
        })
        .then(response => response.json())
        .then(properties => {
            // Remove loading message
            chatBody.removeChild(chatBody.lastChild);
            
            if (properties.length === 0) {
                addMessage("I couldn't find any properties matching your budget. Would you like to try a different amount?", 'bot');
                return;
            }
            
            let propertiesHTML = "<p>Here are some properties that match your budget:</p>";
            
            properties.forEach(property => {
                propertiesHTML += `
                    <div class="property-card" data-id="${property.id}">
                        <img src="/static/images/properties/${property.image}" alt="${property.name}" class="property-image">
                        <div class="property-details">
                            <h3 class="property-name">${property.name}</h3>
                            <p class="property-price">$${property.price.toLocaleString()}</p>
                            <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                            <div class="property-actions">
                                <button class="btn btn-primary" onclick="showInterest('${property.id}')">I'm Interested</button>
                                <button class="btn btn-outline" onclick="bookVisit('${property.id}')">Book Visit</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            addMessage(propertiesHTML, 'bot', true);
            currentStep = 'ask_interest';
        })
        .catch(error => {
            console.error('Error:', error);
            chatBody.removeChild(chatBody.lastChild);
            addMessage("Sorry, there was an error searching for properties. Please try again later.", 'bot');
        });
    }
    
    function processInterest(response) {
        // Handled by button clicks in property cards
    }
    
    function processInfo(response) {
        // Handled by form submission
    }
    
    function processBooking(response) {
        // Handled by form submission
    }
    
    // Global functions for button clicks
    window.showInterest = function(propertyId) {
        selectedProperty = propertyId;
        
        const interestForm = `
            <div class="interest-form">
                <p>Please provide your details so we can contact you about this property:</p>
                <div class="form-group">
                    <label for="interest-name">Your Name</label>
                    <input type="text" id="interest-name" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label for="interest-email">Email Address</label>
                    <input type="email" id="interest-email" placeholder="john@example.com">
                </div>
                <div class="form-group">
                    <label for="interest-phone">Phone Number</label>
                    <input type="tel" id="interest-phone" placeholder="(123) 456-7890">
                </div>
                <div class="form-actions">
                    <button class="btn btn-outline" onclick="cancelForm()">Cancel</button>
                    <button class="btn btn-primary" onclick="submitInterest()">Submit</button>
                </div>
            </div>
        `;
        
        addMessage(interestForm, 'bot', true);
        currentStep = 'collect_info';
    };
    
    window.bookVisit = function(propertyId) {
        selectedProperty = propertyId;
        
        const bookingForm = `
            <div class="booking-form">
                <p>Please provide your details and preferred visit time:</p>
                <div class="form-group">
                    <label for="booking-name">Your Name</label>
                    <input type="text" id="booking-name" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label for="booking-email">Email Address</label>
                    <input type="email" id="booking-email" placeholder="john@example.com">
                </div>
                <div class="form-group">
                    <label for="booking-phone">Phone Number</label>
                    <input type="tel" id="booking-phone" placeholder="(123) 456-7890">
                </div>
                <div class="form-group">
                    <label for="booking-date">Visit Date</label>
                    <input type="date" id="booking-date">
                </div>
                <div class="form-group">
                    <label for="booking-time">Visit Time</label>
                    <input type="time" id="booking-time">
                </div>
                <div class="form-actions">
                    <button class="btn btn-outline" onclick="cancelForm()">Cancel</button>
                    <button class="btn btn-primary" onclick="submitBooking()">Book Visit</button>
                </div>
            </div>
        `;
        
        addMessage(bookingForm, 'bot', true);
        currentStep = 'book_visit';
    };
    
    window.cancelForm = function() {
        chatBody.removeChild(chatBody.lastChild);
        addMessage("What would you like to do next?", 'bot');
        currentStep = 'ask_interest';
    };
    
    window.submitInterest = function() {
        const name = document.getElementById('interest-name').value.trim();
        const email = document.getElementById('interest-email').value.trim();
        const phone = document.getElementById('interest-phone').value.trim();
        
        if (!name || !email || !phone) {
            alert("Please fill in all fields");
            return;
        }
        
        addMessage("Submitting your interest...", 'bot');
        
        fetch('/submit_interest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                property_id: selectedProperty,
                name: name,
                email: email,
                phone: phone
            })
        })
        .then(response => response.json())
        .then(data => {
            chatBody.removeChild(chatBody.lastChild);
            
            if (data.status === 'success') {
                addMessage(data.message, 'bot');
                addMessage("Would you like to look at more properties or book a visit for another one?", 'bot');
                currentStep = 'ask_more_properties'; // Updated this line
            } else {
                addMessage(data.message, 'bot');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            chatBody.removeChild(chatBody.lastChild);
            addMessage("Sorry, there was an error submitting your interest. Please try again later.", 'bot');
        });
    };
    
    window.submitBooking = function() {
        const name = document.getElementById('booking-name').value.trim();
        const email = document.getElementById('booking-email').value.trim();
        const phone = document.getElementById('booking-phone').value.trim();
        const date = document.getElementById('booking-date').value;
        const time = document.getElementById('booking-time').value;
        
        if (!name || !email || !phone || !date || !time) {
            alert("Please fill in all fields");
            return;
        }
        
        addMessage("Booking your visit...", 'bot');
        
        fetch('/book_visit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                property_id: selectedProperty,
                name: name,
                email: email,
                phone: phone,
                date: date,
                time: time
            })
        })
        .then(response => response.json())
        .then(data => {
            chatBody.removeChild(chatBody.lastChild);
            
            if (data.status === 'success') {
                addMessage(data.message, 'bot');
                addMessage("Would you like to look at more properties or express interest in another one?", 'bot');
                currentStep = 'ask_more_properties'; // Updated this line
            } else {
                addMessage(data.message, 'bot');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            chatBody.removeChild(chatBody.lastChild);
            addMessage("Sorry, there was an error booking your visit. Please try again later.", 'bot');
        });
    };
});