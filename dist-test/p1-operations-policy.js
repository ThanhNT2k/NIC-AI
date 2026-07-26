export function canRequestWorkOrderClosure(tasks) {
    return tasks.length > 0 && tasks.every((task) => !task.required || task.status === "completed");
}
export function canApproveOwnChange(makerId, checkerId) {
    return makerId.length > 0 && checkerId.length > 0 && makerId !== checkerId;
}
export function addBusinessMinutes(startEpoch, minutes, windows, holidays, timeZone = "Asia/Ho_Chi_Minh") {
    if (!Number.isInteger(startEpoch) || !Number.isInteger(minutes) || minutes < 0)
        throw new Error("BUSINESS_TIME_INVALID");
    let cursor = startEpoch;
    let remaining = minutes;
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (let guard = 0; guard < 60 * 24 * 370; guard += 1, cursor += 60) {
        const values = Object.fromEntries(parts.formatToParts(new Date(cursor * 1000)).map((part) => [part.type, part.value]));
        const date = `${values.year}-${values.month}-${values.day}`;
        const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(values.weekday);
        const minute = Number(values.hour) * 60 + Number(values.minute);
        const working = !holidays.has(date) && windows.some((window) => window.weekday === weekday && minute >= window.startsMinute && minute < window.endsMinute);
        if (working) {
            if (remaining === 0)
                return cursor;
            remaining -= 1;
        }
    }
    throw new Error("BUSINESS_CALENDAR_EXHAUSTED");
}
export function escalationKey(instanceId, threshold, dueAt) {
    return `${instanceId}:${threshold}:${dueAt}`;
}
export function hasRequiredSkills(required, activeSkills) {
    const available = new Set(activeSkills);
    return required.every((skill) => available.has(skill));
}
export function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
    return leftStart < rightEnd && leftEnd > rightStart;
}
export function nextProviderResponseVersion(currentVersion, response) {
    if (!Number.isInteger(currentVersion) || currentVersion < 1)
        throw new Error("VERSION_INVALID");
    return { version: currentVersion + 1, requiresNicConfirmation: response === "accept_with_change" };
}
