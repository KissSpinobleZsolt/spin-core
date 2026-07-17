import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Btn } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { ProgressBar } from '../../../components/ui/progressBar'
import { DropZone } from '../../../components/ui/dropZone'
import { Input } from '../../../components/ui/input'
import { DUMMY_EVENTS } from './DUMMY_EVENTS.constant'

// Demo layout for the Anoma Scan (vision-watch) module — YOLO video analysis + fine-tuning
export function AnomaScanLayout() {
  const [file, setFile]         = useState<File | null>(null)  // selected video file for YOLO analysis
  const [ftFile, setFtFile]     = useState<File | null>(null)  // fine-tune dataset ZIP
  const [progress, setProgress] = useState(0)                  // processing progress 0–100
  const [running, setRunning]   = useState(false)              // true while the simulation interval is active

  function simulate() {
    if (!file) return                                                                // guard: no file selected
    setRunning(true)                                                                // mark analysis as in-progress
    setProgress(5)                                                                  // kick off at 5% to signal immediate activity
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 95) { clearInterval(id); setRunning(false); return 100 }          // clear interval and finish at 100%
        return p + 10                                                               // advance 10% per tick
      })
    }, 300)                                                                         // tick every 300 ms
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">👁️</span>
        <div>
          <p className="font-bold text-slate-800 dark:text-white">Anoma Scan</p>
          <p className="text-sm text-slate-500">YOLO object detection on video — upload, analyze, fine-tune</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Analyze Video</p>
          <div className="mb-3">
            <label className="block text-xs text-slate-500 mb-1">Model</label>
            <select className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>yolov8n (base)</option>
              <option>yolov8s (small)</option>
            </select>
          </div>
          <DropZone
            file={file}
            hint="MP4, AVI, MOV — max 500 MB"
            accept="video/*"
            onFiles={([f]) => { setFile(f); setProgress(0) }} // reset progress when a new file is dropped
          />
          {progress > 0 && ( // only show the bar once processing has started
            <div className="mt-3">
              <ProgressBar value={progress} label={running ? `Processing… ${progress}%` : 'Done'} color={progress === 100 ? 'green' : 'blue'} />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Btn disabled={!file || running} onClick={simulate}>
              {running ? 'Analyzing…' : 'Run YOLO'}
            </Btn>
            {file && !running && ( // only show Clear once a file is present and not mid-run
              <Btn variant="secondary" onClick={() => { setFile(null); setProgress(0) }}>Clear</Btn>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Fine-Tune Model</p>
          <p className="text-sm text-slate-500 mb-3">
            Upload a ZIP with a YOLO-format labeled dataset (images/ + labels/ + data.yaml). A new model will be trained for your custom classes.
          </p>
          <DropZone
            file={ftFile}
            hint=".zip — YOLO dataset format"
            accept=".zip"
            onFiles={([f]) => setFtFile(f)} // store the uploaded fine-tune dataset ZIP
          />
          <div className="mt-3">
            <Input label="Epochs" type="number" defaultValue="10" />
          </div>
          <div className="mt-3">
            <Btn disabled={!ftFile}>Start Training</Btn>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Detection Events</p>
          <div className="flex gap-2">
            {(['Events', 'Classes', 'Top label'] as const).map((l, i) => (
              <div key={l} className="text-center px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-bold text-slate-800 dark:text-white text-sm">{[3, 4, 2][i]}</p> {/* summary counts derived from DUMMY_EVENTS */}
                <p className="text-[10px] text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {DUMMY_EVENTS.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5">
              <span className="text-xs font-mono text-blue-500 pt-0.5 w-10 shrink-0">{ev.ts}</span> {/* timestamp column */}
              <div>
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {ev.labels.map(l => <Badge key={l} variant="info">{l}</Badge>)} {/* one badge per detected class */}
                </div>
                <p className="text-xs text-slate-400">
                  {ev.conf.map(c => `${c.l} ${c.p}%`).join('  ')} {/* confidence scores per label */}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
