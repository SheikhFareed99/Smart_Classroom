AICO – AI Classroom Platform
Project Status

In Progress (Not Completed Yet)
AICO is currently under active development as a university project.

Overview

AICO is a university project that works like a smart version of Google Classroom. It allows students and teachers to interact with course materials using AI-powered tools, instant question-answer chatbots, and productivity features.

Instead of manually downloading and reading materials, students can directly interact with course content using an AI system.

Key Features
1. Course-Based Learning System
Each course has its own dedicated space
Teachers can upload:
Lectures
Assignments
Notes
Other learning resources
2. AI Chatbot per Course (RAG System)
Each course has its own AI assistant
Students can ask questions directly from course material
Built using Retrieval Augmented Generation (RAG)
No need to manually search through documents

Tech stack:

Pinecone (vector database)
OpenRouter / LLM APIs
Hugging Face Transformers
Cosine similarity embeddings
3. Instant Knowledge Access
No waiting or manual reading of PDFs
Upload → process → instantly queryable via chatbot
4. Assignment System
Teachers can assign tasks
Students can submit assignments online
Integrated AI assistance for learning support
5. Plagiarism Checker
Semantic similarity-based detection
Uses cosine similarity for text comparison
Helps ensure originality in student submissions
6. Voice Features (In Progress)
Voice-based interaction with chatbot
Voice-over explanations for learning materials
7. Study Tools
Study timer (Pomodoro-style)
Notes system
Personal student dashboard / study board
Tech Stack
Frontend
React
TypeScript
Backend
Node.js
Express.js
Authentication system
AI / ML
RAG pipeline
Pinecone (vector database)
Hugging Face Transformers
OpenRouter LLMs
Storage
Azure Blob Storage for course materials
System Workflow
Teacher uploads material to Azure Blob Storage
Text is extracted and converted into embeddings
Embeddings are stored in Pinecone vector database
Student asks a question which is embedded
Relevant context is retrieved from vector database
Context is sent to LLM for response generation
Current Status
Frontend and backend are under development
RAG system is being integrated
Voice features and plagiarism checker are in progress
Goal

To build an AI-powered learning ecosystem where students can learn faster, interact with course materials directly, and reduce dependency on manual searching.
