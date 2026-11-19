import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "document.pdf")
TXT_PATH = os.path.join(BASE_DIR, "document.txt")
DOCUMENT_PATH = PDF_PATH if os.path.exists(PDF_PATH) else TXT_PATH
INDEX_SAVE_DIR = os.path.join(BASE_DIR, "faiss_index")


def create_faiss_index():
    print(f"Loading document: {DOCUMENT_PATH}...")
    if not os.path.exists(DOCUMENT_PATH):
        raise FileNotFoundError(f"Neither document.pdf nor document.txt was found in {BASE_DIR}")

    if DOCUMENT_PATH.endswith(".pdf"):
        loader = PyPDFLoader(DOCUMENT_PATH)
    else:
        loader = TextLoader(DOCUMENT_PATH, encoding="utf-8")

    docs = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800, chunk_overlap=150
    )
    chunks = text_splitter.split_documents(docs)
    print(f"Total Chunks Created: {len(chunks)}")

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vector_store = FAISS.from_documents(chunks, embeddings)
    vector_store.save_local(INDEX_SAVE_DIR)
    print(f"FAISS Index successfully saved to '{INDEX_SAVE_DIR}/'")

if __name__ == "__main__":
    create_faiss_index()