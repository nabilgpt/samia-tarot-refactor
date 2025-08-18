# list_models.py
from google import genai

# إنك تزوّد المفتاح يدوياً أو تحمله من متغير بيئة:
client = genai.Client(api_key="AIzaSyAdgZA9LLn6-YXeQonEJ5vFoIsRaD1IloY")
# أو استخدم المتغير البيئي:
# client = genai.Client()

# اطلب قائمة النماذج
models = client.models.list()

# اطبع الأسماء للتأكد
print("Available Gemini models:")
for m in models:
    print("-", m.name)
