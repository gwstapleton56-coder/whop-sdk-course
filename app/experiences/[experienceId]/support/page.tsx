"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { createSupportTicket } from "./actions";

export default function SupportPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Resolve params
  useEffect(() => {
    params.then((p) => setExperienceId(p.experienceId));
  }, [params]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    
    startTransition(() => {
      createSupportTicket(formData)
        .then(() => {
          setSubmitted(true);
          setSubject("");
          setMessage("");
        })
        .catch((err: any) => {
          console.error("Failed to submit support ticket:", err);
          setError(err?.message || "Failed to submit. Please try again.");
        });
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
          Skill Accelerator — Help Center
        </h1>
        <p className="text-xl text-slate-700 mb-2 font-medium">
          Practice with intention. Improve faster.
        </p>
        <p className="text-base text-slate-600 leading-relaxed">
          This guide explains how Skill Accelerator works, how to use practice
          modes effectively, and what to do if you need help.
        </p>
      </div>

      {/* A) Getting Started */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">
          A) Getting Started
        </h2>

        <div className="space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              What is Skill Accelerator?
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Skill Accelerator is an adaptive practice app designed to help you
              build real skill, not just consume information.
            </p>
            <p className="text-slate-700 leading-relaxed mt-2">
              You practice by working through drills that adjust based on your
              input, answers, and focus.
            </p>
            <p className="text-slate-700 leading-relaxed mt-2">
              The goal is simple:
            </p>
            <p className="text-slate-700 leading-relaxed mt-3 font-semibold text-base">
              Deliberate practice → clearer thinking → better decisions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              What is a "Niche"?
            </h3>
            <p className="text-slate-700 leading-relaxed">
              A niche is the skill domain you're practicing in (for example:
              Trading, Sports Betting, Social Media, Fitness, or Custom).
            </p>
            <p className="text-slate-700 leading-relaxed mt-2">
              Each niche:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 mt-2 ml-4">
              <li>Uses domain-specific language</li>
              <li>Generates relevant drills and scenarios</li>
              <li>Keeps your practice focused and realistic</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              You can switch niches at any time.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              How a Practice Session Works
            </h3>
            <ol className="list-decimal list-inside text-slate-700 space-y-1 ml-4">
              <li>You describe what you're struggling with</li>
              <li>The app generates a focused objective</li>
              <li>You choose how you want to practice</li>
              <li>Drills adapt as you progress</li>
            </ol>
            <p className="text-slate-700 leading-relaxed mt-2">
              Sessions are designed to be short, focused, and repeatable.
            </p>
          </div>
        </div>
      </section>

      {/* B) Practice Modes */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
          B) Practice Modes (How to Use Each One)
        </h2>
        <p className="text-base text-slate-700 leading-relaxed mb-8">
          Choosing the right practice mode makes a big difference. Here's how to
          think about each option:
        </p>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl font-bold text-slate-900">🅰</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Checklist / Routine
                </h3>
                <p className="text-sm text-slate-600 font-medium">
                  Best for: Structure, clarity, consistency
                </p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed mb-2">
              Use this when:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>You feel scattered or unsure where to start</li>
              <li>You want a repeatable process</li>
              <li>You're building fundamentals</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              You'll get step-by-step guidance you can reuse.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl font-bold text-slate-900">🅱</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Multiple-Choice Quiz
                </h3>
                <p className="text-sm text-slate-600 font-medium">
                  Best for: Testing understanding and spotting gaps
                </p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed mb-2">
              Use this when:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>You want to check if you actually understand something</li>
              <li>You're preparing for real decisions</li>
              <li>You want fast feedback</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Great for catching blind spots.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl font-bold text-slate-900">🅲</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Coaching Q&A
                </h3>
                <p className="text-sm text-slate-600 font-medium">
                  Best for: Thinking better, not memorizing
                </p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed mb-2">
              Use this when:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>You want feedback on your reasoning</li>
              <li>You're unsure why something works</li>
              <li>You want to refine judgment</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              This mode focuses on how you think, not just the answer.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl font-bold text-slate-900">🅳</span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Scenario Practice
                </h3>
                <p className="text-sm text-slate-600 font-medium">
                  Best for: Real-world decision making
                </p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed mb-2">
              Use this when:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>You want realistic situations</li>
              <li>You want to practice under context</li>
              <li>You're preparing for live execution</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              Scenarios simulate real conditions and trade-offs.
            </p>
          </div>
        </div>
      </section>

      {/* C) Sessions & Progress */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">
          C) Sessions & Progress
        </h2>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Do sessions save automatically?
            </h3>
            <p className="text-slate-700 leading-relaxed">Yes. Your progress is saved as you go.</p>
            <p className="text-slate-700 leading-relaxed mt-2">
              You'll see:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 mt-2 ml-4">
              <li>Your current drill</li>
              <li>The last time it was saved</li>
              <li>Your active niche and practice mode</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              What happens when I start a new session?
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Starting a new session:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 mt-2 ml-4">
              <li>Clears the current drills</li>
              <li>Keeps you in the same niche (unless you change it)</li>
              <li>Generates a new focus and practice flow</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-2">
              It does not affect other niches.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Why do drills change over time?
            </h3>
            <p className="text-slate-700 leading-relaxed">
              The app adapts based on:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 mt-2 ml-4">
              <li>Your answers</li>
              <li>The level of detail you provide</li>
              <li>Whether you're improving or struggling</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-2">
              This is intentional — it keeps practice challenging and useful.
            </p>
          </div>
        </div>
      </section>

      {/* D) Account & Access */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">
          D) Account & Access
        </h2>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Free vs Pro
            </h3>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>
                <strong>Free:</strong> Limited practice sessions
              </li>
              <li>
                <strong>Pro:</strong> Unlimited sessions across all niches
              </li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-2">
              If you reach a limit, you'll be prompted inside the app.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              What does Pro unlock?
            </h3>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>Unlimited practice sessions</li>
              <li>Full access to all practice modes</li>
              <li>No session caps</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-2">
              Once unlocked, Pro applies automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
          Contact Support
        </h2>
        <p className="text-base text-slate-700 leading-relaxed mb-8">
          If something doesn't look right or you have a question, reach out
          directly.
        </p>

        {submitted ? (
          <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6 shadow-sm">
            <p className="text-green-800 font-semibold text-base">
              Thank you! We've received your message and will get back to you soon.
            </p>
          </div>
        ) : experienceId ? (
          <form
            action={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <input type="hidden" name="experienceId" value={experienceId} />
            <input type="hidden" name="niche" value="" />

            {error && (
              <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4">
                <p className="text-red-800 font-medium text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="subject"
                className="block text-sm font-semibold text-slate-900 mb-2.5"
              >
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
                required
              >
                <option value="">Select a subject</option>
                <option value="bug">Bug / Something isn't working</option>
                <option value="question">Question about using the app</option>
                <option value="billing">Billing / Access issue</option>
              </select>
            </div>

            <div className="mb-8">
              <label
                htmlFor="message"
                className="block text-sm font-semibold text-slate-900 mb-2.5"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Tell us what happened&#10;Include what niche you were in (if relevant)"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !subject || !message}
              style={{
                backgroundColor: isPending || !subject || !message ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
              }}
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/30 border-2 border-blue-500/40 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/40 focus:outline-none focus:ring-4 focus:ring-blue-400/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-400 disabled:hover:shadow-md"
            >
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-slate-600">Loading...</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="pt-8 border-t border-slate-200">
        <p className="text-slate-600 text-center leading-relaxed">
          <strong>That's it.</strong>
        </p>
        <p className="text-slate-600 text-center leading-relaxed mt-2">
          Skill Accelerator is designed to stay out of your way and help you
          practice better, faster, and with intention.
        </p>
        <p className="text-slate-600 text-center leading-relaxed mt-2">
          If something feels off — tell us.
        </p>
      </div>
    </div>
  );
}

