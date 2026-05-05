# 📄 Product Requirements Document (PRD) — Yumi

---

## 1. Background & Goal

Existing music streaming services (e.g., Spotify, YouTube Music) provide a vast amount of content, which often leads to **choice overload**.

In addition, recommendation algorithms rely heavily on past preferences, causing users to experience **filter bubbles**, where similar types of music are repeatedly suggested.

As a result, users struggle to find music that matches their **current mood or situation**, leading to reduced satisfaction.

### 🎯 Goal

The goal of this project is to address these issues by developing an AI-based service that allows users to **generate their own music**.

Yumi leverages a Suno API-based system to shift the experience from:

👉 **“music recommendation” → “emotion-driven music creation”**

---

## 2. Users & Stakeholders

### 👤 Primary Users

#### 1. Students

* Need music for studying, focusing, or relaxing
* Spend time searching for the right mood

#### 2. Music Enthusiasts

* Interested in creating music based on emotions and ideas
* Want creative participation, not just consumption

---

### 🧠 User Characteristics

* Want to move from **listening → creating**
* Value **emotion-based personalization**
* Experience fatigue from repetitive recommendations

---

### 🤝 Stakeholders

* Developers (AI / Frontend / Backend)
* AI API providers (Suno API)
* Future partners (content platforms, entertainment companies)

---

## 3. Current Journey & Pain Points

### 🔄 Current User Behavior

* Search repeatedly on YouTube Music
* Switch playlists frequently on Spotify
* Try new music but return to similar recommendations

---

### ❗ Pain Points

* Hard to find music matching current mood
* Recommendation systems are repetitive
* No way to participate in music creation
* Cannot reflect personal emotions or ideas

---

### 🔍 Hidden Needs

* Sense of ownership (“music I created”)
* Instant access to emotion-matching music
* Desire to participate in creation

---

## 4. Problem Definition (POV) & HMW

### 📌 Problem Statement (POV)

Users of music streaming platforms struggle to efficiently discover music that matches their current emotional state due to overwhelming content and repetitive recommendations.

---

### 💡 How Might We (HMW)

* How might we enable users to **instantly obtain music that matches their emotions and goals**?
* How might we transform users from passive listeners into **active creators of music**?

---

## 5. Success Metrics

### 📊 Usage Metrics

* Daily usage frequency
* Number of music generations per user

---

### 📈 Engagement Metrics

* Playback rate of generated music
* Retention rate

---

### ⭐ Satisfaction Metrics

* User ratings (likes, scores)
* Positive feedback ratio

---

### 🧠 Key Hypothesis

* Music is consumed daily → high usage potential
* Continuous generation → repeat engagement
* Emotion-based generation → stronger personalization

---

## 6. Scope, Constraints & Assumptions

### 🔧 Core Feature

Generate new music based on:

* Emotion
* Preferences
* Text input

---

### 🔄 User Flow

1. Emotion input

   * “How do you feel today?”
   * Select or type

2. Preference input

   * Genre, artist

3. Creative input

   * Lyrics, mood, sound, voice

4. Result generation

   * Music + album cover + video

---

### ⚙️ Technical Assumptions

* Music generation via Suno API
* Output includes:

  * `audio_url`
  * `image_url`
  * `video_url`

---

### ⚠️ Constraints

* 4-week MVP timeline
* No music editing
* Focus on generation, not recommendation

---

### 🎯 Service Concept

👉 **“Music created from your emotions”**

* Users become creators, not just listeners

---

## ✅ Final One-line Definition

👉 **Yumi is an emotion-driven AI music creation platform that generates personalized music based on user input and preferences.**
