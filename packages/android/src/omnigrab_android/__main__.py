"""
OmniGrab Android — BeeWare Briefcase Application Entry Point
"""
from omnigrab_android.app import OmniGrabAndroid


def main():
    return OmniGrabAndroid()


if __name__ == "__main__":
    main().main_loop()
