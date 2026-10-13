
from selenium import webdriver
from selenium.webdriver.common.by import By


def test_safalcrm_homepage():
    driver = webdriver.Chrome()

    try:
        # Open the SafalCRM website
        driver.get("http://localhost:3000")

        # Verify that the page has loaded
        assert driver.execute_script(
            "return document.readyState"
        ) == "complete"

        # Verify that the page body is visible
        body = driver.find_element(By.TAG_NAME, "body")
        assert body.is_displayed()

        # Verify that the page contains some text
        assert len(body.text.strip()) > 0

        print("SafalCRM homepage test PASSED")

    finally:
        # Close the browser after testing
        driver.quit()
