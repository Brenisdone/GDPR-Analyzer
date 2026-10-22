#!/usr/bin/env python3.7
# coding: utf-8

from datetime import timedelta
import time

import json
import configparser
import os


config = configparser.ConfigParser()
config.read(os.path.dirname(__file__) + '/config.ini')


class Bcolors:
    HEADER = '\033[95m'
    CYAN = "\033[36m"
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    RESET = '\033[0m'
    REVERSE = "\033[;7m"


def cookie_expiration(cookie_creation_time, cookie_expiry):
    """
    calculate the cookies expiry time and define
    the number of cookies per duration step in
    order to give a score
    :param cookie_creation_time: time of cookie creation
    :param cookie_expiry: cookie expiry time
    :return: expiration_delay, expiry_point
    """

    expiry_point = 0

    more_thirty_month_pt = int(config['delay_point']['more_thirty_month'])
    thirty_month_pt = int(config['delay_point']['thirty_month'])
    eight_month_pt = int(config['delay_point']['eight_month'])
    six_month_pt = int(config['delay_point']['six_month'])
    three_month_pt = int(config['delay_point']['three_month'])
    one_month_pt = int(config['delay_point']['one_month'])

    try:

        expiration_delay = timedelta(seconds=cookie_expiry - cookie_creation_time)

        # define the number of points according to each expiry time range
        if expiration_delay.days > 394:  # + 13 month
            expiry_point = more_thirty_month_pt

        elif expiration_delay.days > 240:  # 8 month < delay < 13 month
            expiry_point += thirty_month_pt

        elif expiration_delay.days > 180:  # 6 month < delay < 8 month
            expiry_point += eight_month_pt

        elif expiration_delay.days > 90:  # 3 month < delay < 6 month
            expiry_point += six_month_pt

        elif expiration_delay.days > 30:  # 1 month < delay < 3 month
            expiry_point += three_month_pt

        else:  # - 1 month
            expiry_point += one_month_pt

    except KeyError:  # no value for expiry field in database
        expiration_delay = 'session cookie'

    return expiration_delay, expiry_point


def third_party_cookie(cookie_domain, website_url):
    """
    calculate the number of third party cookies and
    define a score
    :param cookie_domain: domain of the server that deposited the cookie
    :param website_url: url of website to analyze
    :return: third_party, third_party_point
    """

    # compare the cookie domain to the url of the website we analyze
    if website_url.find(cookie_domain) >= 0:
        third_party = False
        third_party_point = 0
    else:
        third_party = True
        third_party_point = int(config['third_party']['third_party'])

    return third_party, third_party_point


def is_http_only(is_http_only_attribute):
    """
    check the isHttpOnly attribute of the cookie to define
    if it is inaccessible to JavaScript's Document.cookie API
    and is only sent to the server
    :param is_http_only_attribute: isHttpOnly cookie attribute
    :return: http_only_cookie, http_only_point
    """

    if is_http_only_attribute:
        http_only_cookie = True
        http_only_point = 0
    else:
        http_only_cookie = False
        http_only_point = int(config['cookie_attributes']['isHttpOnly'])

    return http_only_cookie, http_only_point


def is_secure(is_secure_attribute):
    """
    check the isSecure attribute of the cookie to define
    if it is secure (encrypted request over the HTTPS protocol)
    :param is_secure_attribute: isSecure cookie attribute
    :return: secure_cookie, secure_point
    """

    if is_secure_attribute:
        secure_cookie = True
        secure_point = 0
    else:
        secure_cookie = False
        secure_point = int(config['cookie_attributes']['isSecure'])

    return secure_cookie, secure_point


def cookie_score_calculation(
    expiry_score,
    third_party_score,
    secure_score=0,
    http_only_score=0,
):
    """Calculate the cumulative cookie penalty score."""
    return (
        expiry_score
        + third_party_score
        + secure_score
        + http_only_score
    )


def cookie_grade_calculation(cookie_score):
    """
    calculate the cookie grade for the website we analyze
    :param cookie_score: global score for cookies
    :return: cookie_grade
    """

    a_grade = int(config['grade']['A'])
    b_grade = int(config['grade']['B'])
    c_grade = int(config['grade']['C'])
    d_grade = int(config['grade']['D'])
    e_grade = int(config['grade']['E'])

    if cookie_score <= a_grade:
        cookie_grade = "A"
    elif cookie_score <= b_grade:
        cookie_grade = "B"
    elif cookie_score <= c_grade:
        cookie_grade = "C"
    elif cookie_score <= d_grade:
        cookie_grade = "D"
    elif cookie_score <= e_grade:
        cookie_grade = "E"
    else:
        cookie_grade = "F"

    return cookie_grade


def cookie_evaluate(cookies, target):
    """
    Evaluate cookies and return the score and details as JSON.
    Expects Selenium/WebDriver cookie dictionaries.
    """
    global_cookie_score = 0
    result = {"details": {}}

    print(
        f"{Bcolors.UNDERLINE}{Bcolors.BOLD}"
        f"Detected cookie(s):{Bcolors.RESET}\n"
    )

    for cookie in cookies:
        if not isinstance(cookie, dict):
            raise TypeError(
                "Expected Selenium cookie dictionaries. "
                f"Received {type(cookie).__name__}."
            )

        name = cookie.get("name", "<unknown>")
        cookie_domain = cookie.get("domain", "")
        cookie_expiry = cookie.get("expiry")

        # WebDriver does not expose the original creation time.
        cookie_creation_time = int(time.time())

        secure_attribute = cookie.get("secure", False)
        http_only_attribute = cookie.get("httpOnly", False)

        # Evaluate the cookie's domain.
        third_party, third_party_point = third_party_cookie(
            cookie_domain, target
        )

        # Evaluate expiry. Session cookies have no expiry timestamp.
        if cookie_expiry is None:
            expiration_delay = "session cookie"
            expiry_point = 0
        else:
            expiration_delay, expiry_point = cookie_expiration(
                cookie_creation_time,
                cookie_expiry,
            )

        # Evaluate security attributes.
        secure_cookie, secure_point = is_secure(
            secure_attribute
        )
        http_only_cookie, http_only_point = is_http_only(
            http_only_attribute
        )

        # Calculate and accumulate the cookie's penalty score.
        cookie_score = cookie_score_calculation(
            expiry_point,
            third_party_point,
            secure_point,
            http_only_point,
        )
        global_cookie_score += cookie_score

        # Avoid overwriting details when cookie names repeat.
        detail_key = name
        suffix = 2
        while detail_key in result["details"]:
            detail_key = f"{name} #{suffix}"
            suffix += 1

        # Save evidence for reporting and future API responses.
        result["details"][detail_key] = {
            "name": name,
            "domain": cookie_domain,
            "expiration": str(expiration_delay),
            "third_party": third_party,
            "secure": secure_cookie,
            "http_only": http_only_cookie,
            "score": cookie_score,
        }

        # Display metadata only; never display cookie values.
        print(
            f"  Cookie: {name}\n"
            f"  Domain: {cookie_domain}\n"
            f"  Secure: {secure_cookie}\n"
            f"  HttpOnly: {http_only_cookie}\n"
            f"  Third-party: {third_party}\n"
            f"  Expiration: {expiration_delay}\n"
            f"  Penalty score: {cookie_score}\n"
        )

    # Calculate the overall cookie grade.
    cookie_grade = cookie_grade_calculation(global_cookie_score)

    result["grade"] = cookie_grade
    result["score"] = global_cookie_score

    cookie_result = {"cookies": result}

    print(
        f"\n{Bcolors.BOLD}{Bcolors.UNDERLINE}"
        f"Cookie score:{Bcolors.RESET} {global_cookie_score}\n"
        f"{Bcolors.BOLD}{Bcolors.UNDERLINE}"
        f"Cookie grade:{Bcolors.RESET} {cookie_grade}\n"
    )

    return json.dumps(cookie_result, indent=4)