import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
import uvicorn
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI(title="RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INDEX_SAVE_DIR = os.path.join(BASE_DIR, "faiss_index")
embeddings = None
vector_store = None

try:
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    if os.path.exists(INDEX_SAVE_DIR):
        vector_store = FAISS.load_local(
            INDEX_SAVE_DIR, embeddings, allow_dangerous_deserialization=True
        )
        print(f"Loaded FAISS index from {INDEX_SAVE_DIR}")
    else:
        print(f"[Notice] FAISS index directory '{INDEX_SAVE_DIR}' not found yet. Run ingest.py to build it.")
except Exception as e:
    print(f"[Warning] FAISS initialization skipped: {e}")

groq_key = os.getenv("GROQ_API_KEY")
llm = None
if groq_key and groq_key.strip() and "insert your api key" not in groq_key.lower():
    try:
        llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key=groq_key.strip(),
            temperature=0.2,
        )
        print("ChatGroq initialized successfully.")
    except Exception as groq_err:
        print(f"[Warning] ChatGroq initialization error: {groq_err}")

SYSTEM_PROMPT = """
You are a helpful customer support assistant. Answer the user's question using ONLY the provided context.
If the answer cannot be found in the context, say "I couldn't find information to answer that question."

Context:
{context}
"""

prompt_template = ChatPromptTemplate.from_messages(
    [("system", SYSTEM_PROMPT), ("human", "{question}")]
)


class ChatRequest(BaseModel):
    question: str


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="A non-empty question is required.")

        question = request.question.strip()
        context = ""

        if vector_store is not None:
            try:
                docs = vector_store.similarity_search(question, k=3)
                context = "\n\n".join([doc.page_content for doc in docs])
            except Exception as search_err:
                print(f"[Warning] Vector similarity search failed: {search_err}")

        if llm is not None:
            formatted_prompt = prompt_template.format_messages(
                context=context or "General portal customer support guidance.",
                question=question
            )
            response = llm.invoke(formatted_prompt)
            answer = response.content
        else:
            # Contextual answer from documentation if available, or guidance
            if context:
                answer = context
            else:
                lower = question.lower()
                if "certificate" in lower or "request" in lower:
                    answer = "To request a certificate, log in to your intern dashboard, click 'Request Certificate' on the Overview tab, select the certificate type, and submit."
                elif "verify" in lower or "qr" in lower:
                    answer = "Every official certificate features a scannable QR verification code and a unique 12-character Verification ID that can be authenticated at /verify/:verifyId."
                elif "password" in lower or "settings" in lower:
                    answer = "You can manage your password or mobile number in the Settings tab of your dashboard. Your initial secret is your Intern Code."
                else:
                    answer = "Hello! I am your Website Assistant. How can I help you today with your certificate requests, account settings, or internship guidelines?"

        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)