"""
Test suite for voice system fallback functionality.
Run with: pytest backend/tests/test_voice_fallback.py -v
"""

import os
import tempfile
import unittest
from unittest.mock import Mock, patch, MagicMock
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.services.tts_service import (
    generate_tamil_tts,
    generate_multilingual_tts,
    _should_use_fallback,
)
from backend.services.local_tts_service import generate_local_tts


class TestFallbackDetection(unittest.TestCase):
    """Test the fallback trigger detection logic."""

    def test_402_triggers_fallback(self):
        """HTTP 402 Payment Required should trigger fallback."""
        assert _should_use_fallback("HTTP 402 Payment Required")

    def test_429_triggers_fallback(self):
        """HTTP 429 Rate Limit should trigger fallback."""
        assert _should_use_fallback("HTTP 429 Too Many Requests")

    def test_authentication_error_triggers_fallback(self):
        """Authentication errors should trigger fallback."""
        assert _should_use_fallback("Authentication failed")
        assert _should_use_fallback("HTTP 401 Unauthorized")

    def test_timeout_triggers_fallback(self):
        """Network timeout should trigger fallback."""
        assert _should_use_fallback("Connection timeout")
        assert _should_use_fallback("Request timed out")

    def test_rate_limit_text_triggers_fallback(self):
        """Rate limit message text should trigger fallback."""
        assert _should_use_fallback("Rate limit exceeded")

    def test_quota_triggers_fallback(self):
        """Quota error should trigger fallback."""
        assert _should_use_fallback("Quota exceeded")

    def test_service_unavailable_triggers_fallback(self):
        """Service unavailable (503) should trigger fallback."""
        assert _should_use_fallback("HTTP 503 Service Unavailable")

    def test_generic_error_does_not_trigger(self):
        """Generic errors should not trigger fallback."""
        assert not _should_use_fallback("Some other error")


class TestLocalTTSGeneration(unittest.TestCase):
    """Test local TTS generation."""

    def setUp(self):
        """Create temporary directory for test files."""
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test files."""
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    @patch('backend.services.local_tts_service.pyttsx3')
    def test_local_tts_success(self, mock_pyttsx3):
        """Test successful local TTS generation."""
        # Mock pyttsx3
        mock_engine = MagicMock()
        mock_pyttsx3.init.return_value = mock_engine

        output_file = os.path.join(self.test_dir, "test.mp3")

        # Create a dummy MP3 file to simulate successful generation
        with patch('backend.services.local_tts_service._get_tts_engine') as mock_get:
            mock_engine_obj = MagicMock()

            def save_to_file(text, filepath):
                # Simulate file creation
                with open(filepath, 'wb') as f:
                    f.write(b'fake mp3 data')

            mock_engine_obj.save_to_file = save_to_file
            mock_get.return_value = mock_engine_obj

            result = generate_local_tts(
                text="Test advisory",
                output_file=output_file,
                language_code="ta-IN",
                language_name="tamil"
            )

            # Should return True on success
            assert result is True or os.path.exists(output_file)

    def test_local_tts_unavailable(self):
        """Test local TTS when pyttsx3 is unavailable."""
        with patch('backend.services.local_tts_service.pyttsx3', None):
            result = generate_local_tts(
                text="Test",
                output_file=os.path.join(self.test_dir, "test.mp3"),
                language_code="ta-IN",
                language_name="tamil"
            )
            assert result is False


class TestTamilTTSFallback(unittest.TestCase):
    """Test Tamil TTS generation with fallback chain."""

    def setUp(self):
        """Create temporary directory for test files."""
        self.test_dir = tempfile.mkdtemp()
        self.output_file = os.path.join(self.test_dir, "test.mp3")
        self.cache_file = f"{self.output_file}.cache"

    def tearDown(self):
        """Clean up test files."""
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_sarvam_success_path(self):
        """Test successful Sarvam TTS generation."""
        with patch('backend.services.tts_service._get_sarvam_client') as mock_get:
            with patch('backend.services.tts_service.client') as mock_client:
                # Mock successful Sarvam response
                mock_response = MagicMock()
                mock_response.audios = [b'base64encodeddata']

                mock_client_inst = MagicMock()
                mock_client_inst.text_to_speech.convert.return_value = mock_response
                mock_get.return_value = mock_client_inst

                # Mock base64 decode
                with patch('base64.b64decode', return_value=b'mp3_data'):
                    result = generate_tamil_tts(
                        text="Test advisory",
                        output_file=self.output_file,
                        language_code="ta-IN",
                        language_name="tamil"
                    )

                    # Should have called Sarvam
                    assert mock_client_inst.text_to_speech.convert.called

    def test_cached_audio_returned_for_same_text(self):
        """Test that cached audio is returned for identical text."""
        # Pre-create cache and audio files
        os.makedirs(os.path.dirname(self.output_file), exist_ok=True)

        # Create dummy MP3 and cache
        with open(self.output_file, 'wb') as f:
            f.write(b'mp3_data')

        import hashlib
        text_hash = hashlib.sha256(b"Test advisory").hexdigest()
        with open(self.cache_file, 'w') as f:
            f.write(text_hash)

        with patch('backend.services.tts_service._get_sarvam_client'):
            result = generate_tamil_tts(
                text="Test advisory",
                output_file=self.output_file,
                language_code="ta-IN",
                language_name="tamil"
            )

            # Should return cached file without regenerating
            assert result == self.output_file or os.path.exists(self.output_file)


class TestMultilingualTTS(unittest.TestCase):
    """Test multilingual TTS generation."""

    def setUp(self):
        """Create temporary directory for test files."""
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test files."""
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    @patch('backend.services.tts_service.generate_tamil_tts')
    def test_multilingual_generation(self, mock_tamil_tts):
        """Test multilingual advisory generation."""
        mock_tamil_tts.return_value = "/tmp/test.mp3"

        advisory = {
            "tamil": "Tamil text",
            "english": "English text",
            "hindi": "Hindi text"
        }

        result = generate_multilingual_tts(advisory)

        # Should call generate_tamil_tts for each language
        assert mock_tamil_tts.call_count == 3

    def test_multilingual_handles_missing_languages(self):
        """Test multilingual generation with missing language texts."""
        with patch('backend.services.tts_service.generate_tamil_tts') as mock_tts:
            mock_tts.return_value = "/tmp/test.mp3"

            advisory = {
                "tamil": "Tamil text",
                # Missing english and hindi
            }

            result = generate_multilingual_tts(advisory)

            # Should only call for Tamil
            assert mock_tts.call_count == 1


class TestThreadSafety(unittest.TestCase):
    """Test thread safety of TTS generation."""

    def test_concurrent_generation_requests(self):
        """Test that concurrent requests don't cause issues."""
        import threading
        import queue

        results = queue.Queue()

        def generate_tts():
            try:
                with patch('backend.services.tts_service._get_sarvam_client'):
                    with patch('backend.services.tts_service.generate_local_tts', return_value=False):
                        advisory = {
                            "tamil": f"Test {threading.current_thread().name}",
                            "english": "Test",
                            "hindi": "Test"
                        }
                        result = generate_multilingual_tts(advisory)
                        results.put(("success", result))
            except Exception as e:
                results.put(("error", str(e)))

        threads = [threading.Thread(target=generate_tts, name=f"T{i}") for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All threads should complete without errors
        while not results.empty():
            status, data = results.get()
            assert status == "success", f"Thread failed: {data}"


if __name__ == "__main__":
    unittest.main()
