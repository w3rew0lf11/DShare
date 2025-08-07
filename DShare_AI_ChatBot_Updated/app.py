from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from chatbot import get_bot_response  

app = Flask(__name__, template_folder='templates')
CORS(app)  

@app.route("/")
def index():
    return render_template("index.html")  

@app.route("/get", methods=["POST"])
def get_bot_response_route():
    data = request.get_json()
    user_input = data.get('message', '').strip()
    
    if not user_input:
        return jsonify({'reply': 'No input provided.'}), 400
    
    bot_reply = get_bot_response(user_input)
    return jsonify({'reply': bot_reply})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5010, debug=True)
