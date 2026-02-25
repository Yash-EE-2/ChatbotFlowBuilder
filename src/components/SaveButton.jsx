/**
 * @file SaveButton.jsx
 * @description Animated save button for the Chatbot Flow Builder navbar.
 *
 * Design pattern: Promise-based handshake
 * ────────────────────────────────────────
 * This button uses a creative inversion-of-control pattern to decouple
 * visual feedback from validation logic:
 *
 *   1. When clicked, SaveButton creates a Promise and extracts its `resolve`.
 *   2. SaveButton calls `onSave(resolve)` — passing the resolve function
 *      UP to the parent (App.handleSave).
 *   3. App runs its validation rules, then calls `resolve(true)` on success
 *      or `resolve(false)` on failure.
 *   4. SaveButton awaits the resolved value and transitions to `success` or
 *      `error` state for 1.8 seconds before returning to `idle`.
 *
 * This design:
 *   • Keeps validation logic entirely out of this component.
 *   • Lets the button animate independently on its own timer.
 *   • Is trivially testable — just call onSave with a mock resolve.
 *
 * Visual states
 * ─────────────
 *   idle    → purple gradient, "Save Flow" + Save icon
 *   saving  → muted indigo, "Saving…"  (briefly while awaiting resolve)
 *   success → emerald,       "Saved!"  + Check icon    (1.8 s then resets)
 *   error   → rose,          "Failed"  + AlertTriangle (1.8 s then resets)
 *
 * @param {object}   props
 * @param {Function} props.onSave — (resolve: (passed: boolean) => void) => void
 *                                   Called with a Promise resolve callback.
 *                                   Parent must call resolve(true|false).
 */

import React, { useState, useCallback } from 'react';
import { Save, Check, AlertTriangle } from 'lucide-react';


/**
 * Configuration table for all four button states.
 * Having this outside the component avoids recreating the object on every render.
 *
 * Each entry:
 *   label     {string}    — button text
 *   Icon      {Component} — Lucide icon component
 *   className {string}    — Tailwind classes controlling background/text/scale
 */
const STATE_CONFIG = {
    idle: {
        label: 'Save Flow',
        Icon: Save,
        className: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-500 hover:to-brand-400 hover:shadow-node active:scale-95',
    },
    saving: {
        label: 'Saving…',
        Icon: Save,
        className: 'bg-[#312e81] text-brand-300 cursor-wait',
    },
    success: {
        label: 'Saved!',
        Icon: Check,
        className: 'bg-emerald-600 text-white scale-95 cursor-default',
    },
    error: {
        label: 'Failed',
        Icon: AlertTriangle,
        className: 'bg-rose-700 text-white scale-95 cursor-default',
    },
};


export default function SaveButton({ onSave }) {
    /**
     * Current visual state of the button.
     * @type {'idle' | 'saving' | 'success' | 'error'}
     */
    const [status, setStatus] = useState('idle');

    /**
     * Handles the button click:
     *   1. Guards against double-clicks (only acts in 'idle' state).
     *   2. Transitions to 'saving' immediately for user feedback.
     *   3. Wraps the parent's onSave in a Promise to get the validation result.
     *   4. Transitions to 'success' or 'error' based on result.
     *   5. Resets to 'idle' after 1.8 s.
     *
     * `async` allows us to `await` the Promise resolve from the parent.
     */
    const handleClick = useCallback(async () => {
        // Debounce: ignore clicks when already saving or showing feedback
        if (status !== 'idle') return;

        setStatus('saving');

        /**
         * Create a Promise and pass its resolve function to onSave.
         * The parent (App.handleSave) will call resolve(true) on success
         * or resolve(false) on validation failure.
         *
         * @type {boolean} passed — true if save succeeded, false if it failed
         */
        const passed = await new Promise((resolve) => {
            onSave(resolve);
        });

        // Transition to the appropriate feedback state
        setStatus(passed ? 'success' : 'error');

        // Auto-reset to idle after 1.8 seconds
        setTimeout(() => setStatus('idle'), 1800);
    }, [status, onSave]);

    // Look up the config for the current state
    const { label, Icon, className } = STATE_CONFIG[status];

    return (
        <button
            onClick={handleClick}
            disabled={status !== 'idle'} /* disable during saving/feedback to prevent re-trigger */
            id="save-flow-button"        /* stable id for E2E tests / automation */
            aria-label={`Save flow — current status: ${status}`}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                transition-all duration-200 select-none
                ${className}
            `}
        >
            {/* Icon strokeWidth is slightly heavier for the Check mark for visual clarity */}
            <Icon size={15} strokeWidth={status === 'success' ? 2.5 : 2} />
            {label}
        </button>
    );
}
