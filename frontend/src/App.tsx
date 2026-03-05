import React, { useState } from "react";
import axios from "axios";

const App: React.FC = () => {
  const [name, setName] = useState<string>("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<string>("");
  const [missingDate, setMissingDate] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!photo) return alert("Photo is required");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("age", age.toString());
    formData.append("gender", gender);
    formData.append("missing_date", missingDate);
    formData.append("photo", photo);

    try {
      const response = await axios.post(
        "http://localhost:5000/report-missing",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      alert("Success: " + response.data.message);
      // Clear form
      setName("");
      setAge("");
      setGender("");
      setMissingDate("");
      setPhoto(null);
    } catch (error) {
      console.error(error);
      alert("Error submitting form");
    }
  };

  return (
    <div className="minitems-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Report Missing Person
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <br /><br />

          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <br /><br />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <br /><br />

          <input
            type="date"
            value={missingDate}
            onChange={(e) => setMissingDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <br /><br />
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setPhoto(e.target.files ? e.target.files[0] : null)
            }
            className="w-full"
            required
          />
          <br /><br />
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;