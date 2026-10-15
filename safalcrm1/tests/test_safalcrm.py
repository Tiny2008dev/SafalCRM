from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from time import sleep

def test_safalcrm_homepage():
    print("SafalCRM Selenium test started")
    
    options = Options() #creates an object for Chrome configuration.
    options.add_experimental_option("excludeSwitches", ["enable-logging"])

    driver = webdriver.Chrome(options=options)#Launch chrome

    try:
        driver.get("http://localhost:3000")

        print("Website title:", driver.title)

        assert driver.title != "", "Website title is empty"

        body = driver.find_element(By.TAG_NAME, "body")
        assert body.is_displayed(), "Page body is not visible"
        assert len(body.text.strip()) > 0, "Page contains no visible text"

        print("TEST PASSED: SafalCRM homepage loaded successfully")

    finally:
        sleep(3)
        driver.quit()



if __name__ == "__main__":
    test_safalcrm_homepage()#call function