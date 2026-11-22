FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json .
RUN npm install
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/main.py .
COPY --from=frontend-builder /frontend/dist ./static

RUN python3 -c '
with open("main.py") as f:
    code = f.read()

code = code.replace("@app.get(\"/search\")", "@app.get(\"/api/search\")")
code = code.replace("@app.get(\"/weather\")", "@app.get(\"/api/weather\")")
code = code.replace("@app.get(\"/weather/coords\")", "@app.get(\"/api/weather/coords\")")

code += """
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="static", html=True), name="static")
"""

with open("main.py", "w") as f:
    f.write(code)
'

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
