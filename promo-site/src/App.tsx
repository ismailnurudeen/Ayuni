import { FormEvent, useState } from "react";

type WaitlistForm = {
  fullName: string;
  phoneNumber: string;
  city: string;
};

type WaitlistErrors = Partial<Record<keyof WaitlistForm, string>>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, string | number | boolean>>;
  }
}

const launchCity = "Lagos";
const waitlistCities = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Other"];

const proofPoints = [
  "Real dates",
  "Real people",
  "No endless swiping",
];

const dateLocations = [
  "Cocktail bars",
  "Cafe dates",
  "Brunch spots",
  "Lounges",
  "Dessert places",
  "Hotel lobbies",
];

function track(event: string, payload: Record<string, string | number | boolean> = {}) {
  window.dataLayer?.push({ event, ...payload });
}

function validate(form: WaitlistForm): WaitlistErrors {
  const errors: WaitlistErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = "Enter your full name.";
  }

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = "Enter your phone number.";
  } else if (!/^\+?[0-9()\-\s]{8,}$/.test(form.phoneNumber.trim())) {
    errors.phoneNumber = "Use a valid phone number.";
  }

  if (!form.city.trim()) {
    errors.city = "Select your city.";
  }

  return errors;
}

export function App() {
  const [form, setForm] = useState<WaitlistForm>({
    fullName: "",
    phoneNumber: "",
    city: launchCity,
  });
  const [errors, setErrors] = useState<WaitlistErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function updateField(field: keyof WaitlistForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    track("waitlist_submit", { city: form.city });
    setSubmitted(true);
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">AYUNI</div>
        <a
          className="topbar-link"
          href="#waitlist"
          onClick={() => track("hero_cta_click", { source: "header" })}
        >
          Join waitlist
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Lagos-first launch</p>
          <h1>Dating should lead to dates.</h1>
          <p className="lede">
            For Lagos singles tired of talking stages, ghosting, and chats that go nowhere. Ayuni helps you skip the back-and-forth and get to a real date faster.
          </p>

          <div className="proof-row" aria-label="Ayuni value proposition">
            {proofPoints.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="offer-callout">
            <p className="offer-callout__eyebrow">Launch perk</p>
            <h2>First drink&apos;s on us.</h2>
            <p className="offer">
              For the first few weeks after launch, selected first dates in {launchCity} get a drink on Ayuni. Limited availability. Terms apply.
            </p>
          </div>
        </div>

        <section className="waitlist-card" id="waitlist">
          <p className="waitlist-label">Join the waitlist</p>
          <h2>Get early access</h2>
          <p className="waitlist-copy">
            Join now if you want in before the first Lagos launch wave fills up.
          </p>

          {submitted ? (
            <div className="success">
              <p className="success-label">You’re on the list</p>
              <h3>We’ll reach out as Lagos access opens.</h3>
              <p>
                Ayuni is launching in controlled waves, starting with {launchCity}. Other cities can join now and roll in after.
              </p>
            </div>
          ) : (
            <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
              <label>
                <span>Full name</span>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Adaeze Okafor"
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                />
                {errors.fullName ? <small className="error">{errors.fullName}</small> : null}
              </label>

              <label>
                <span>Phone number</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+234 801 234 5678"
                  value={form.phoneNumber}
                  onChange={(event) => updateField("phoneNumber", event.target.value)}
                />
                {errors.phoneNumber ? <small className="error">{errors.phoneNumber}</small> : null}
              </label>

              <label>
                <span>City</span>
                <select value={form.city} onChange={(event) => updateField("city", event.target.value)}>
                  {waitlistCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {errors.city ? <small className="error">{errors.city}</small> : null}
              </label>

              <button
                className="cta"
                type="submit"
                onClick={() => track("hero_cta_click", { source: "form_button" })}
              >
                Join the waitlist
              </button>
            </form>
          )}
        </section>
      </section>

      <section className="locations">
        <p className="locations-label">Beautiful first date locations</p>
        <div className="locations-row" aria-label="Date locations">
          {dateLocations.map((location) => (
            <span key={location}>{location}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
