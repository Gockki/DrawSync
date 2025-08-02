import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Luo OpenAI client uudella tyylillä (v1+)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Vakio-promptti: insinöörityön mukainen tiedon poiminta OCR-tekstistä
def build_prompt(ocr_text: str) -> str:
    return (
        "Toimi kuin kokenut teollisuusinsinööri. Tehtäväsi on poimia teknisestä piirustuksesta puretun OCR-tekstin perusteella seuraavat tiedot, jäsenneltyyn JSON-muotoon:\n\n"
        "- drawing_info: nimi, koodi, revisio, piirtäjä, päiväys\n"
        "- parts_list: osa, määrä, materiaali, paino, mahdollinen standardi\n"
        "- dimensions: mitat (arvo, yksikkö, selite, toleranssi)\n"
        "- standards: kaikki mainitut standardit (esim. DIN, ISO, 140 HV, jne)\n\n"
        "Jos jokin tieto puuttuu, jätä kenttä tyhjäksi.\n"
        
        "Etsi tekstistä mittoja esim D50, L=153, M16x150, Ø25, ±0.1 osaat varmasti itse selvittää mitä ne on\n"
        "Palauta vain JSON, älä lisää selityksiä.\n"
        "OCR-teksti on tässä:\n\n"
        f"{ocr_text}"
    )



# GPT API -kutsu, palauttaa JSON-rakenteen
def extract_structured_data(ocr_text: str) -> dict:
    prompt = build_prompt(ocr_text)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
    )

    raw = response.choices[0].message.content

    try:
        # Poista mahdollinen ```json ... ``` wrapper ennen JSON-parsintaa
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned)
    except Exception as e:
        raise ValueError(f"GPT response is not valid JSON: {e}\n\nResponse was:\n{raw}")
