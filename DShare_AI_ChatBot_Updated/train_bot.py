
import pandas as pd
import joblib
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

data = pd.read_csv('data/chatbot_data.csv')
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(data['question'])
y = data['answer']

model = MultinomialNB()
model.fit(X, y)

joblib.dump(model, 'model/chatbot_model.pkl')
joblib.dump(vectorizer, 'model/vectorizer.pkl')
print("✅ Training done and model saved!")
