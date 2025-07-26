import React, { useState, useEffect } from "react";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    role: "mentee",
    region: "",
    career: "",
    expertise: "",
    experience_years: "",
    bio: "",
    voice_call: false,
    languages: [],
  });

  const [languageOptions, setLanguageOptions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/languages")
      .then((res) => res.json())
      .then((data) => setLanguageOptions(data))
      .catch((err) => console.error("Language fetch error", err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, options } = e.target;

    if (name === "languages") {
      const selected = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);
      setFormData({ ...formData, languages: selected });
    } else if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        alert("Registration successful!");
        console.log(result);
      } else {
        alert("Registration failed!");
        console.error(result.error);
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Server error during registration");
    }
  };

  const isMentor = formData.role === "mentor";
  const isMentee = formData.role === "mentee";

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input type="text" name="name" placeholder="Name" required onChange={handleChange} />
        <input type="email" name="email" placeholder="Email" required onChange={handleChange} />
        <input type="password" name="password" placeholder="Password" required onChange={handleChange} />
        <input type="number" name="age" placeholder="Age" required onChange={handleChange} min={10} max={100} />

        <select name="role" onChange={handleChange} value={formData.role}>
          <option value="">--Select Role--</option>
          <option value="mentor">Mentor</option>
          <option value="mentee">Mentee</option>
        </select>

        <input type="text" name="region" placeholder="Region" required onChange={handleChange} />

        <input
          type="text"
          name="career"
          placeholder={isMentor ? "Your Career" : "Line of Interest"}
          required
          onChange={handleChange}
        />

        {isMentor && (
          <>
            <input type="text" name="expertise" placeholder="Expertise (eg. Math, Science)" onChange={handleChange} />
            <input
              type="number"
              name="experience_years"
              placeholder="Years of Experience"
              min="0"
              onChange={handleChange}
            />
            <textarea name="bio" placeholder="Short Bio" onChange={handleChange} />
            <label>
              <input type="checkbox" name="available" onChange={handleChange} /> Voice Call Available?
            </label>
          </>
        )}

        <label>
          Select Language(s):
          <select
            name="languages"
            multiple
            value={formData.languages}
            onChange={handleChange}
            size="5"
            style={{ width: "200px" }}
          >
            {languageOptions.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
