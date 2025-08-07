


import joblib
import csv
import difflib

# Load ML model and vectorizer
model = joblib.load('model/chatbot_model.pkl')
vectorizer = joblib.load('model/vectorizer.pkl')

# Load Q&A data from CSV (only once)
def load_qa_data(csv_file='./data/chatbot_data.csv'):
    qa_list = []
    with open(csv_file, mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            qa_list.append({
                "question": row["question"].strip().lower(),
                "answer": row["answer"].strip(),
                "link": row["link"].strip()
            })
    return qa_list

qa_data = load_qa_data()

# Match user input to closest question in CSV
def get_csv_response(user_input, threshold=0.5):
    user_input = user_input.lower().strip()
    
    # Try direct or partial matches first
    for entry in qa_data:
        if entry["question"] in user_input or user_input in entry["question"]:
            return entry["answer"]
    
    # Fallback to fuzzy match
    questions = [q["question"] for q in qa_data]
    closest = difflib.get_close_matches(user_input, questions, n=1, cutoff=threshold)
    
    if closest:
        for entry in qa_data:
            if entry["question"] == closest[0]:
                return entry["answer"]
    
    return None

# Unified response handler
def get_bot_response(user_input):
    try:
        # First, use ML model to predict
        X = vectorizer.transform([user_input])
        response = model.predict(X)[0]

        if response and "DShare" in response:
            return response

    except Exception as e:
        print("Model error:", e)

    # If ML fails or response is not DShare-related, use CSV fallback
    csv_response = get_csv_response(user_input)
    if csv_response:
        return csv_response

    return "Sorry, I cannot assist you. I am only trained for the DShare platform."
