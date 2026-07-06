import React from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-white backdrop-blur-sm bg-opacity-90 text-blue-500 pt-16 pb-8 px-6 md:px-20">
      {/* Top Section */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
        {/* Brand */}
        <div>
          <h2 className="text-3xl font-bold text-blue-400">Properly</h2>
          <p className="mt-4 text-xl leading-relaxed text-orange-400">
            We help property investors make smart, tax-optimized and profitable
            decisions through research-driven insights as well as track the
            expenses related to property.
          </p>

          <p className="mt-5 text-xl font-medium text-gray-800">
            ACN:{" "}
            <span className="text-xl transition-colors duration-300 hover:text-orange-400">
              664 478 595
            </span>
          </p>
        </div>

        {/* Services */}
        <div>
          <h3 className="mb-4 border-l-4 border-orange-400 pl-3 text-2xl font-semibold text-blue-400">
            Services
          </h3>
          <ul className="space-y-3 text-xl text-black">
            <li>
              <a
                href="#about"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Property Tax Advisory
              </a>
            </li>
            <li>
              <a
                href="#about"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Investment Planning
              </a>
            </li>
            <li>
              <a
                href="#about"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Portfolio Review
              </a>
            </li>
            <li>
              <a
                href="#about"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Home Loan Assistance
              </a>
            </li>
            <li>
              <a
                href="#about"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Property Evaluation
              </a>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h3 className="mb-4 border-l-4 border-orange-400 pl-3 text-2xl font-semibold text-blue-400">
            Resources
          </h3>
          <ul className="space-y-3 text-xl text-black">
            <li>
              <a
                href="#faq"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                FAQ
              </a>
            </li>
            <li>
              <a
                href="#blog"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Blog
              </a>
            </li>
            <li>
              <a
                href="#help"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Help Center
              </a>
            </li>
            <li>
              <a
                href="#guides"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Guides
              </a>
            </li>
            <li>
              <a
                href="#policy"
                className="text-xl transition-colors duration-300 hover:text-orange-400"
              >
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="mb-4 border-l-4 border-orange-400 pl-3 text-2xl font-semibold text-blue-400">
            Contact
          </h3>

          <p className="text-xl text-black">
            <strong>Phone:</strong> +61 493 767 832
          </p>

          <p className="mt-3 text-xl text-black">
            <strong>Email:</strong>{" "}
            <a
              href="mailto:support@properly.com"
              className="transition-colors duration-300 hover:text-orange-400"
            >
              support@properly.com
            </a>
          </p>

          {/* Social Icons */}
          <div className="mt-6 flex space-x-4">
            <a
              href="#contact"
              className="flex items-center justify-center transform rounded-full border border-orange-400 p-3 text-blue-400 transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-6 hover:bg-orange-400 hover:text-white"
            >
              <FaFacebookF size={18} />
            </a>
            <a
              href="#contact"
              className="flex items-center justify-center transform rounded-full border border-orange-400 p-3 text-blue-400 transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-6 hover:bg-orange-400 hover:text-white"
            >
              <FaInstagram size={18} />
            </a>
            <a
              href="#contact"
              className="flex items-center justify-center transform rounded-full border border-orange-400 p-3 text-blue-400 transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-6 hover:bg-orange-400 hover:text-white"
            >
              <FaLinkedinIn size={18} />
            </a>
            <a
              href="#contact"
              className="flex items-center justify-center transform rounded-full border border-orange-400 p-3 text-blue-400 transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-6 hover:bg-orange-400 hover:text-white"
            >
              <FaYoutube size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mt-12 border-t border-gray-700 pt-6 text-center">
        <p className="text-xl text-gray-500">
          © 2025 All Rights Reserved by{" "}
          <span className="font-medium text-blue-400">Properly</span>.
        </p>
      </div>
    </footer>
  );
}
