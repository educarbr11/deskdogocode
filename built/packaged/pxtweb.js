// redirect for IE11 (unsupported)
(function _() {
    if (typeof navigator !== "undefined" && /Trident/i.test(navigator.userAgent)
        && !/skipbrowsercheck=1/i.exec(window.location.href)
        && !/\/browsers/i.exec(window.location.href)) {
        window.location.href = "/browsers";
        return;
    }
})();
var pxt;
(function (pxt) {
    const eventBufferSizeLimit = 20;
    const queues = [];
    let analyticsLoaded = false;
    let interactiveConsent = false;
    let isProduction = false;
    let partnerName;
    class TelemetryQueue {
        constructor(log) {
            this.log = log;
            this.q = [];
            queues.push(this);
        }
        track(a, b, c) {
            if (analyticsLoaded) {
                this.log(a, b, c);
            }
            else {
                this.q.push([a, b, c]);
                if (this.q.length > eventBufferSizeLimit)
                    this.q.shift();
            }
        }
        flush() {
            while (this.q.length) {
                const [a, b, c] = this.q.shift();
                this.log(a, b, c);
            }
        }
    }
    let eventLogger;
    let exceptionLogger;
    // performance measuring, added here because this is amongst the first (typescript) code ever executed
    let perf;
    (function (perf) {
        let enabled;
        perf.stats = {
            durations: [],
            milestones: []
        };
        perf.perfReportLogged = false;
        function splitMs() {
            return Math.round(performance.now() - perf.startTimeMs);
        }
        perf.splitMs = splitMs;
        function prettyStr(ms) {
            ms = Math.round(ms);
            let r_ms = ms % 1000;
            let s = Math.floor(ms / 1000);
            let r_s = s % 60;
            let m = Math.floor(s / 60);
            if (m > 0)
                return `${m}m${r_s}s`;
            else if (s > 5)
                return `${s}s`;
            else if (s > 0)
                return `${s}s${r_ms}ms`;
            else
                return `${ms}ms`;
        }
        perf.prettyStr = prettyStr;
        function splitStr() {
            return prettyStr(splitMs());
        }
        perf.splitStr = splitStr;
        function recordMilestone(msg, time = splitMs()) {
            perf.stats.milestones.push([msg, time]);
        }
        perf.recordMilestone = recordMilestone;
        function init() {
            enabled = performance && !!performance.mark && !!performance.measure;
            if (enabled) {
                performance.measure("measure from the start of navigation to now");
                let navStartMeasure = performance.getEntriesByType("measure")[0];
                perf.startTimeMs = navStartMeasure.startTime;
            }
        }
        perf.init = init;
        function measureStart(name) {
            if (enabled)
                performance.mark(`${name} start`);
        }
        perf.measureStart = measureStart;
        function measureEnd(name) {
            if (enabled && performance.getEntriesByName(`${name} start`).length) {
                performance.mark(`${name} end`);
                performance.measure(`${name} elapsed`, `${name} start`, `${name} end`);
                let e = performance.getEntriesByName(`${name} elapsed`, "measure");
                if (e && e.length === 1) {
                    let measure = e[0];
                    let durMs = measure.duration;
                    if (durMs > 10) {
                        perf.stats.durations.push([name, measure.startTime, durMs]);
                    }
                }
                performance.clearMarks(`${name} start`);
                performance.clearMarks(`${name} end`);
                performance.clearMeasures(`${name} elapsed`);
            }
        }
        perf.measureEnd = measureEnd;
        function report(filter = null) {
            perf.perfReportLogged = true;
            if (enabled) {
                const milestones = {};
                const durations = {};
                let report = `performance report:\n`;
                for (let [msg, time] of perf.stats.milestones) {
                    if (!filter || msg.indexOf(filter) >= 0) {
                        let pretty = prettyStr(time);
                        report += `\t\t${msg} @ ${pretty}\n`;
                        milestones[msg] = time;
                    }
                }
                report += `\n`;
                for (let [msg, start, duration] of perf.stats.durations) {
                    let filterIncl = filter && msg.indexOf(filter) >= 0;
                    if ((duration > 50 && !filter) || filterIncl) {
                        let pretty = prettyStr(duration);
                        report += `\t\t${msg} took ~ ${pretty}`;
                        if (duration > 1000) {
                            report += ` (${prettyStr(start)} - ${prettyStr(start + duration)})`;
                        }
                        report += `\n`;
                    }
                    durations[msg] = duration;
                }
                console.log(report);
                return { milestones, durations };
            }
            return undefined;
        }
        perf.report = report;
        (function () {
            init();
            recordMilestone("first JS running");
        })();
    })(perf = pxt.perf || (pxt.perf = {}));
    function initAnalyticsAsync() {
        if (isNativeApp() || shouldHideCookieBanner()) {
            initializeAppInsightsInternal(true);
            return;
        }
        if (window.pxtSkipAnalyticsCookie) {
            initializeAppInsightsInternal(false);
            return;
        }
        initializeAppInsightsInternal(true);
    }
    pxt.initAnalyticsAsync = initAnalyticsAsync;
    function aiTrackEvent(id, data, measures) {
        if (!eventLogger) {
            eventLogger = new TelemetryQueue((a, b, c) => window.appInsights.trackEvent({
                name: a,
                properties: b,
                measurements: c,
            }));
        }
        eventLogger.track(id, data, measures);
    }
    pxt.aiTrackEvent = aiTrackEvent;
    function aiTrackException(err, kind, props) {
        if (!exceptionLogger) {
            exceptionLogger = new TelemetryQueue((a, b, c) => window.appInsights.trackException({
                exception: a,
                properties: b ? { ...c, ["kind"]: b } : c,
            }));
        }
        exceptionLogger.track(err, kind, props);
    }
    pxt.aiTrackException = aiTrackException;
    function initializeAppInsightsInternal(includeCookie = false) {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has("partner")) {
                partnerName = params.get("partner");
            }
        }
        catch (e) {
            console.warn("Could not parse search string", e);
        }
        // loadAppInsights is defined in docfiles/tracking.html
        const loadAI = window.loadAppInsights;
        if (loadAI) {
            isProduction = loadAI(includeCookie, telemetryInitializer);
            analyticsLoaded = true;
            queues.forEach(a => a.flush());
        }
    }
    pxt.initializeAppInsightsInternal = initializeAppInsightsInternal;
    function telemetryInitializer(envelope) {
        const pxtConfig = window.pxtConfig;
        // App Insights automatically sends a page view event on setup, but we send our own later with additional properties.
        // This stops the automatic event from firing, so we don't end up with duplicate page view events.
        if (envelope.baseType == "PageviewData" && !envelope.baseData.properties) {
            return false;
        }
        if (envelope.baseType == "PageviewPerformanceData") {
            const pageName = envelope.baseData.name;
            envelope.baseData.name = window.location.origin;
            if (!envelope.baseData.properties) {
                envelope.baseData.properties = {};
            }
            envelope.baseData.properties.pageName = pageName;
            envelope.baseData.properties.pathName = window.location.pathname;
            // no url scrubbing for webapp (no share url, etc)
        }
        if (typeof pxtConfig === "undefined" || !pxtConfig)
            return true;
        const telemetryItem = envelope.baseData;
        telemetryItem.properties = telemetryItem.properties || {};
        telemetryItem.properties["target"] = pxtConfig.targetId;
        telemetryItem.properties["stage"] = (pxtConfig.relprefix || "/--").replace(/[^a-z]/ig, '');
        if (partnerName) {
            telemetryItem.properties["partner"] = partnerName;
        }
        const userAgent = navigator.userAgent.toLowerCase();
        const electronRegexResult = /\belectron\/(\d+\.\d+\.\d+.*?)(?: |$)/i.exec(userAgent); // Example navigator.userAgent: "Mozilla/5.0 Chrome/61.0.3163.100 Electron/2.0.0 Safari/537.36"
        if (electronRegexResult) {
            telemetryItem.properties["Electron"] = 1;
            telemetryItem.properties["ElectronVersion"] = electronRegexResult[1];
        }
        const pxtElectron = window.pxtElectron;
        if (typeof pxtElectron !== "undefined") {
            telemetryItem.properties["PxtElectron"] = 1;
            telemetryItem.properties["ElectronVersion"] = pxtElectron.versions.electronVersion;
            telemetryItem.properties["ChromiumVersion"] = pxtElectron.versions.chromiumVersion;
            telemetryItem.properties["NodeVersion"] = pxtElectron.versions.nodeVersion;
            telemetryItem.properties["PxtElectronVersion"] = pxtElectron.versions.pxtElectronVersion;
            telemetryItem.properties["PxtCoreVersion"] = pxtElectron.versions.pxtCoreVersion;
            telemetryItem.properties["PxtTargetVersion"] = pxtElectron.versions.pxtTargetVersion;
            telemetryItem.properties["PxtElectronIsProd"] = pxtElectron.versions.isProd;
        }
        // Kiosk UWP info is appended to the user agent by the makecode-dotnet-apps/arcade-kiosk UWP app
        const kioskUwpRegexResult = /\((MakeCode Arcade Kiosk UWP)\/([\S]+)\/([\S]+)\)/i.exec(userAgent); // Example navigator.userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.60 (MakeCode Arcade Kiosk UWP/0.1.41.0/Windows.Xbox)"
        if (kioskUwpRegexResult) {
            telemetryItem.properties["KioskUwp"] = 1;
            telemetryItem.properties["KioskUwpVersion"] = kioskUwpRegexResult[2];
            telemetryItem.properties["KioskUwpPlatform"] = kioskUwpRegexResult[3];
        }
        // "cookie" does not actually correspond to whether or not we drop the cookie because we recently
        // switched to immediately dropping it rather than waiting. Instead, we maintain the legacy behavior
        // of only setting it to true for production sites where interactive consent has been obtained
        // so that we don't break legacy queries
        telemetryItem.properties["cookie"] = interactiveConsent && isProduction;
        return true;
    }
    function setInteractiveConsent(enabled) {
        interactiveConsent = enabled;
    }
    pxt.setInteractiveConsent = setInteractiveConsent;
    /**
     * Checks for pxt-electron and Code Connection
     */
    function isNativeApp() {
        const hasWindow = typeof window !== "undefined";
        const isPxtElectron = hasWindow && !!window.pxtElectron;
        const isCC = hasWindow && !!window.ipcRenderer || /ipc=1/.test(location.hash) || /ipc=1/.test(location.search); // In WKWebview, ipcRenderer is injected later, so use the URL query
        return isPxtElectron || isCC;
    }
    /**
     * Checks whether we should hide the cookie banner
     */
    function shouldHideCookieBanner() {
        //We don't want a cookie notification when embedded in editor controllers, we'll use the url to determine that
        const noCookieBanner = isIFrame() && /nocookiebanner=1/i.test(window.location.href);
        return noCookieBanner;
    }
    function isIFrame() {
        try {
            return window && window.self !== window.top;
        }
        catch (e) {
            return false;
        }
    }
    /**
     * checks for sandbox
     */
    function isSandboxMode() {
        //This is restricted set from pxt.shell.isSandBoxMode and specific to share page
        //We don't want cookie notification in the share page
        const sandbox = /sandbox=1|#sandbox|#sandboxproject/i.test(window.location.href);
        return sandbox;
    }
})(pxt || (pxt = {}));
