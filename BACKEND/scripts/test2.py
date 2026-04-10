import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hems_backend.settings')
import django
django.setup()

from langchain_groq import ChatGroq
try:
    llm = ChatGroq(model_name="llama3-8b-8192")
    print(llm.invoke("Hi"))
except Exception as e:
    print(e)
