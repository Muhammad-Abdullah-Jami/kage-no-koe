"""
Model download handler with progress tracking for Ollama
"""
import ollama
import json
import logging
from typing import Callable, Optional
from threading import Thread

logger = logging.getLogger(__name__)

class DownloadProgressTracker:
    """Tracks download progress for Ollama model pulls"""

    def __init__(self):
        self.active_downloads = {}  # {model_name: {status, progress, size, downloaded}}

    def start_download(self, model_name: str, progress_callback: Optional[Callable] = None):
        """
        Start downloading a model with progress tracking

        Args:
            model_name: Name of the model to download (e.g., "deepseek-r1:1.5b")
            progress_callback: Optional callback function called with progress updates
        """
        def download_worker():
            try:
                self.active_downloads[model_name] = {
                    'status': 'downloading',
                    'progress': 0,
                    'size': None,
                    'downloaded': None,
                    'error': None
                }

                logger.info(f"Starting download of {model_name}")

                # Pull the model with streaming progress
                stream = ollama.pull(model_name, stream=True)

                for chunk in stream:
                    if 'status' in chunk:
                        status_text = chunk['status']

                        # Parse progress from chunk
                        if 'total' in chunk and 'completed' in chunk:
                            total = chunk['total']
                            completed = chunk['completed']
                            progress = int((completed / total) * 100) if total > 0 else 0

                            self.active_downloads[model_name].update({
                                'progress': progress,
                                'size': self._format_bytes(total),
                                'downloaded': self._format_bytes(completed),
                                'status': 'downloading'
                            })

                            if progress_callback:
                                progress_callback(model_name, self.active_downloads[model_name])

                            logger.debug(f"{model_name}: {progress}% ({completed}/{total} bytes)")

                        # Handle different status messages
                        if 'success' in status_text.lower() or status_text == 'pulling manifest':
                            continue

                # Download completed
                self.active_downloads[model_name] = {
                    'status': 'completed',
                    'progress': 100,
                    'size': self.active_downloads[model_name].get('size'),
                    'downloaded': self.active_downloads[model_name].get('downloaded'),
                    'error': None
                }

                if progress_callback:
                    progress_callback(model_name, self.active_downloads[model_name])

                logger.info(f"Successfully downloaded {model_name}")

            except Exception as e:
                logger.error(f"Failed to download {model_name}: {e}")
                self.active_downloads[model_name] = {
                    'status': 'failed',
                    'progress': 0,
                    'error': str(e)
                }

                if progress_callback:
                    progress_callback(model_name, self.active_downloads[model_name])

        # Start download in background thread
        thread = Thread(target=download_worker, daemon=True)
        thread.start()

    def get_progress(self, model_name: str) -> Optional[dict]:
        """Get current progress for a model download"""
        return self.active_downloads.get(model_name)

    def get_all_progress(self) -> dict:
        """Get progress for all active downloads"""
        return self.active_downloads.copy()

    def clear_completed(self):
        """Remove completed and failed downloads from tracking"""
        self.active_downloads = {
            name: info for name, info in self.active_downloads.items()
            if info['status'] == 'downloading'
        }

    @staticmethod
    def _format_bytes(bytes_num: int) -> str:
        """Format bytes to human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_num < 1024.0:
                return f"{bytes_num:.1f} {unit}"
            bytes_num /= 1024.0
        return f"{bytes_num:.1f} TB"


# Global tracker instance
_tracker = DownloadProgressTracker()

def get_tracker() -> DownloadProgressTracker:
    """Get the global download tracker instance"""
    return _tracker


# CLI usage
if __name__ == "__main__":
    import sys
    import time

    if len(sys.argv) < 2:
        print("Usage: python download_handler.py <model_name>")
        sys.exit(1)

    model_name = sys.argv[1]
    tracker = get_tracker()

    def print_progress(name, info):
        print(f"\r{name}: {info['progress']}% - {info.get('downloaded', '?')} / {info.get('size', '?')}", end='', flush=True)

    tracker.start_download(model_name, progress_callback=print_progress)

    # Wait for download to complete
    while True:
        progress = tracker.get_progress(model_name)
        if progress and progress['status'] in ['completed', 'failed']:
            print(f"\n{progress['status'].upper()}")
            break
        time.sleep(0.5)
